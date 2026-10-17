import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { adminAuditLogs, campaigns, expeditionBookingChanges, expeditionBookings, expeditionDepartures,
  expeditionInterestRequests, expeditionParticipants, expeditionRequestMessages, expeditions,
  organizationUsers, paymentOperations, userNotifications } from "@/db/schema";
import { activeExpeditionHeldSeats } from "@/lib/expedition-seat-holds";
import { departureStatusAfterSeatChange } from "@/lib/expedition-booking-lifecycle";
import { partnerRoleAllows } from "@/lib/partner-permissions";
import { bookingChangeQuote, canPrepareBooking, isTravelId, objectMetadata, participantNames, travelAssert } from "@/lib/expedition-travel";

type Database = typeof db;
export type TravelActor = { id: string; roles: string[] };

async function access(database: Database, expeditionId: string, actor: TravelActor) {
  const [trip] = await database.select({ id: expeditions.id, title: expeditions.title, slug: expeditions.slug,
    metadata: expeditions.metadata, organizationId: campaigns.organizationId })
    .from(expeditions).leftJoin(campaigns, eq(expeditions.relatedCampaignId, campaigns.id))
    .where(eq(expeditions.id, expeditionId)).limit(1);
  travelAssert(trip, "not-found");
  const [membership] = trip.organizationId ? await database.select({ role: organizationUsers.role })
    .from(organizationUsers).where(and(eq(organizationUsers.organizationId, trip.organizationId),
      eq(organizationUsers.userId, actor.id), eq(organizationUsers.status, "active"))).limit(1) : [];
  const isAdmin = actor.roles.includes("admin");
  return { trip, isAdmin, canHost: isAdmin || (actor.roles.includes("partner") && partnerRoleAllows(membership?.role, "expedition:manage")) };
}

async function notify(database: Database, userId: string | null, title: string, message: string, href: string) {
  if (!userId) return;
  await database.insert(userNotifications).values({ userId, notificationCode: `travel-${randomUUID()}`,
    category: "Expeditions", title, message, href });
}

async function audit(database: Database, actor: TravelActor, action: string, entityId: string, metadata: Record<string, unknown> = {}) {
  await database.insert(adminAuditLogs).values({ actorUserId: actor.id, action, entityType: "expedition_journey", entityId, metadata });
}

export async function getTravelRequests(actor: TravelActor) {
  return db.select({ id: expeditionInterestRequests.id, title: expeditions.title, status: expeditionInterestRequests.status,
    requestType: expeditionInterestRequests.requestType, updatedAt: expeditionInterestRequests.updatedAt })
    .from(expeditionInterestRequests).innerJoin(expeditions, eq(expeditions.id, expeditionInterestRequests.expeditionId))
    .where(eq(expeditionInterestRequests.userId, actor.id)).orderBy(desc(expeditionInterestRequests.updatedAt)).limit(100);
}

export async function getPendingTravelChanges(expeditionId: string, actor: TravelActor) {
  const permission = await access(db, expeditionId, actor);
  travelAssert(permission.canHost, "permission");
  return db.select({ id: expeditionBookingChanges.id, bookingId: expeditionBookings.id,
    bookingCode: expeditionBookings.bookingCode, contactName: expeditionBookings.contactName,
    quoteAcceptedAt: expeditionBookingChanges.quoteAcceptedAt, adjustmentConfirmedAt: expeditionBookingChanges.adjustmentConfirmedAt,
    originalAmount: expeditionBookingChanges.originalAmount, quotedAmount: expeditionBookingChanges.quotedAmount })
    .from(expeditionBookingChanges).innerJoin(expeditionBookings, eq(expeditionBookingChanges.bookingId, expeditionBookings.id))
    .where(and(eq(expeditionBookings.expeditionId, expeditionId), eq(expeditionBookingChanges.status, "pending")))
    .orderBy(asc(expeditionBookingChanges.createdAt)).limit(100);
}

export async function getRequestWorkspace(id: string, actor: TravelActor, database: Database = db) {
  travelAssert(isTravelId(id), "not-found");
  const [request] = await database.select().from(expeditionInterestRequests).where(eq(expeditionInterestRequests.id, id)).limit(1);
  travelAssert(request, "not-found");
  const permission = await access(database, request.expeditionId, actor);
  const isOwner = request.userId === actor.id;
  travelAssert(isOwner || permission.canHost, "not-found");
  const [messages, departures] = await Promise.all([
    database.select().from(expeditionRequestMessages).where(eq(expeditionRequestMessages.requestId, id))
      .orderBy(desc(expeditionRequestMessages.createdAt), desc(expeditionRequestMessages.id)).limit(100),
    database.select().from(expeditionDepartures).where(eq(expeditionDepartures.expeditionId, request.expeditionId))
      .orderBy(asc(expeditionDepartures.startsAt))
  ]);
  return { ...permission, canHost: permission.canHost && !isOwner, isOwner, request, messages: messages.reverse(), departures };
}

export async function postTravelMessage(id: string, body: string, actor: TravelActor) {
  travelAssert(body.trim().length >= 1 && body.trim().length <= 4000, "message");
  await db.transaction(async transaction => {
    const tx = transaction as unknown as Database;
    const workspace = await getRequestWorkspace(id, actor, tx);
    const [current] = await tx.select().from(expeditionInterestRequests).where(eq(expeditionInterestRequests.id, id)).for("update");
    travelAssert(!["declined", "cancelled"].includes(current.status), "closed");
    await tx.insert(expeditionRequestMessages).values({ requestId: id, senderUserId: actor.id,
      senderRole: workspace.canHost ? "host" : "traveler", body: body.trim() });
    await tx.update(expeditionInterestRequests).set({ updatedAt: new Date() }).where(eq(expeditionInterestRequests.id, id));
    if (workspace.canHost) await notify(tx, current.userId, workspace.trip.title, "Your host sent a message.", `/expedition-requests/${id}`);
    else if (workspace.trip.organizationId) {
      const hosts = await tx.select({ userId: organizationUsers.userId }).from(organizationUsers)
        .where(and(eq(organizationUsers.organizationId, workspace.trip.organizationId), eq(organizationUsers.status, "active"),
          inArray(organizationUsers.role, ["owner", "manager"])));
      for (const host of hosts) if (host.userId !== actor.id) await notify(tx, host.userId, workspace.trip.title,
        "A traveler sent a message.", `/expedition-requests/${id}`);
    }
  });
}

export async function proposeTravelDeparture(id: string, departureId: string, actor: TravelActor) {
  travelAssert(isTravelId(departureId), "departure");
  await db.transaction(async transaction => {
    const tx = transaction as unknown as Database;
    const workspace = await getRequestWorkspace(id, actor, tx);
    travelAssert(workspace.canHost && workspace.request.userId, "permission");
    const [request] = await tx.select().from(expeditionInterestRequests).where(eq(expeditionInterestRequests.id, id)).for("update");
    travelAssert(!request.bookingId && !["declined", "cancelled"].includes(request.status), "closed");
    const departure = workspace.departures.find(item => item.id === departureId);
    travelAssert(departure && departure.status === "open" && departure.startsAt > new Date() &&
      departure.capacity - departure.seatsBooked >= request.participantsCount, "departure");
    await tx.update(expeditionInterestRequests).set({ proposedDepartureId: departureId, acceptedAt: null,
      status: "contacted", updatedAt: new Date() }).where(eq(expeditionInterestRequests.id, id));
    await tx.insert(expeditionRequestMessages).values({ requestId: id, senderUserId: actor.id, senderRole: "host",
      body: `Departure offered: ${departure.startsAt.toISOString()} — ${departure.endsAt.toISOString()}. Confirm the offer to continue to checkout. Seats are reserved at checkout.` });
    await notify(tx, request.userId, workspace.trip.title, "Your host proposed a departure. Review it in your conversation.", `/expedition-requests/${id}`);
    await audit(tx, actor, "expedition.request.departure_offered", id, { departureId });
  });
}

export async function acceptTravelDeparture(id: string, actor: TravelActor) {
  return db.transaction(async transaction => {
    const tx = transaction as unknown as Database;
    const workspace = await getRequestWorkspace(id, actor, tx);
    travelAssert(workspace.isOwner, "permission");
    const [request] = await tx.select().from(expeditionInterestRequests).where(eq(expeditionInterestRequests.id, id)).for("update");
    if (request.bookingId) return `/expedition-bookings/${request.bookingId}`;
    travelAssert(!["cancelled", "declined"].includes(request.status), "closed");
    const departure = workspace.departures.find(item => item.id === request.proposedDepartureId);
    travelAssert(departure && departure.status === "open" && departure.startsAt > new Date() &&
      departure.capacity - departure.seatsBooked >= request.participantsCount, "departure");
    await tx.update(expeditionInterestRequests).set({ acceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(expeditionInterestRequests.id, id));
    return `/checkout/expedition?${new URLSearchParams({ departure: departure.id, expedition: workspace.trip.slug,
      participants: String(request.participantsCount), requestId: id })}`;
  });
}

export async function getBookingWorkspace(id: string, actor: TravelActor, database: Database = db, lock = false) {
  travelAssert(isTravelId(id), "not-found");
  const query = database.select().from(expeditionBookings).where(eq(expeditionBookings.id, id)).limit(1);
  const [booking] = lock ? await query.for("update") : await query;
  travelAssert(booking, "not-found");
  const permission = await access(database, booking.expeditionId, actor);
  const isOwner = booking.userId === actor.id;
  travelAssert(isOwner || permission.canHost, "not-found");
  const [participants, departures, changes] = await Promise.all([
    database.select().from(expeditionParticipants).where(eq(expeditionParticipants.bookingId, id)).orderBy(asc(expeditionParticipants.createdAt), asc(expeditionParticipants.id)),
    database.select().from(expeditionDepartures).where(eq(expeditionDepartures.expeditionId, booking.expeditionId)).orderBy(asc(expeditionDepartures.startsAt)),
    database.select().from(expeditionBookingChanges).where(eq(expeditionBookingChanges.bookingId, id)).orderBy(desc(expeditionBookingChanges.createdAt)).limit(50)
  ]);
  const departure = departures.find(item => item.id === booking.departureId);
  travelAssert(departure, "not-found");
  return { ...permission, canHost: permission.canHost && !isOwner, isOwner, booking, departure, participants, departures, changes };
}

export async function saveTravelPreparation(id: string, form: FormData, actor: TravelActor) {
  await db.transaction(async transaction => {
    const tx = transaction as unknown as Database;
    const workspace = await getBookingWorkspace(id, actor, tx, true);
    travelAssert(workspace.isOwner && canPrepareBooking(workspace.booking, workspace.departure.startsAt), "preparation");
    await tx.select({ id: expeditionBookings.id }).from(expeditionBookings).where(eq(expeditionBookings.id, id)).for("update");
    for (const participant of workspace.participants) {
      const emergencyContact = String(form.get(`emergency:${participant.id}`) ?? "").trim();
      travelAssert(emergencyContact.length >= 7 && emergencyContact.length <= 220, "emergency-contact");
      await tx.update(expeditionParticipants).set({ emergencyContact }).where(eq(expeditionParticipants.id, participant.id));
    }
    travelAssert(workspace.participants.length === workspace.booking.participantsCount, "participants");
    const acknowledgement = form.get("requirementsAccepted") === "on";
    await tx.update(expeditionBookings).set({ metadata: sql`coalesce(${expeditionBookings.metadata}, '{}'::jsonb) || ${JSON.stringify({
      waiverAccepted: acknowledgement ? "true" : "false", emergencyContactComplete: "true",
      equipmentReviewed: form.get("equipmentReviewed") === "on" ? "true" : "false",
      requirementsAcknowledgedAt: acknowledgement ? new Date().toISOString() : null,
      requirementsAcknowledgedBy: actor.id
    })}::jsonb` }).where(eq(expeditionBookings.id, id));
    await audit(tx, actor, "expedition.preparation.updated", id);
  });
}

export async function confirmTravelBriefing(id: string, actor: TravelActor) {
  await db.transaction(async transaction => {
    const tx = transaction as unknown as Database;
    const workspace = await getBookingWorkspace(id, actor, tx, true);
    travelAssert(workspace.canHost && canPrepareBooking(workspace.booking, workspace.departure.startsAt), "permission");
    await tx.update(expeditionBookings).set({ metadata: sql`coalesce(${expeditionBookings.metadata}, '{}'::jsonb) || ${JSON.stringify({
      briefingCompleted: "true", briefingCompletedAt: new Date().toISOString(), briefingConfirmedBy: actor.id
    })}::jsonb` }).where(eq(expeditionBookings.id, id));
    await notify(tx, workspace.booking.userId, workspace.trip.title, "Your host confirmed your briefing.", `/expedition-bookings/${id}`);
    await audit(tx, actor, "expedition.briefing.confirmed", id);
  });
}

export async function requestTravelBookingChange(id: string, form: FormData, actor: TravelActor) {
  const departureId = String(form.get("departureId") ?? "");
  const count = Number(form.get("participantsCount"));
  const names = participantNames(String(form.get("participantNames") ?? ""), count);
  const reason = String(form.get("reason") ?? "").trim();
  travelAssert(isTravelId(departureId) && reason.length >= 5 && reason.length <= 1000, "change");
  await db.transaction(async transaction => {
    const tx = transaction as unknown as Database;
    const workspace = await getBookingWorkspace(id, actor, tx, true);
    travelAssert(workspace.isOwner && canPrepareBooking(workspace.booking, workspace.departure.startsAt), "change");
    const [booking] = await tx.select().from(expeditionBookings).where(eq(expeditionBookings.id, id)).for("update");
    travelAssert(canPrepareBooking(booking, workspace.departure.startsAt), "change");
    const target = workspace.departures.find(item => item.id === departureId);
    travelAssert(target && target.startsAt > new Date() && (target.status === "open" || target.id === booking.departureId && target.status === "full"), "departure");
    const heldSeats = await activeExpeditionHeldSeats(tx, target.id, new Date(), id);
    travelAssert(target.capacity - target.seatsBooked - heldSeats + (target.id === booking.departureId ? booking.participantsCount : 0) >= count, "capacity");
    const [pending] = await tx.select({ id: expeditionBookingChanges.id }).from(expeditionBookingChanges)
      .where(and(eq(expeditionBookingChanges.bookingId, id), eq(expeditionBookingChanges.status, "pending"))).limit(1);
    travelAssert(!pending, "pending-change");
    const pricing = objectMetadata(booking.metadata).bookingUnitPrice;
    const quote = bookingChangeQuote(booking.totalAmount, booking.participantsCount, count, typeof pricing === "number" ? pricing : undefined);
    await tx.insert(expeditionBookingChanges).values({ bookingId: id, requestedByUserId: actor.id,
      sourceDepartureId: booking.departureId, targetDepartureId: departureId, participantsCount: count, participantNames: names,
      originalAmount: booking.totalAmount, quotedAmount: quote.total.toFixed(2), currency: booking.currency, reason,
      quoteAcceptedAt: quote.difference === 0 ? new Date() : null });
    await audit(tx, actor, "expedition.booking.change_requested", id, { departureId, participantsCount: count });
    if (workspace.trip.organizationId) {
      const hosts = await tx.select({ userId: organizationUsers.userId }).from(organizationUsers)
        .where(and(eq(organizationUsers.organizationId, workspace.trip.organizationId), eq(organizationUsers.status, "active"),
          inArray(organizationUsers.role, ["owner", "manager"])));
      for (const host of hosts) if (host.userId !== actor.id) await notify(tx, host.userId, workspace.trip.title,
        "A traveler requested a booking change.", `/expedition-bookings/${id}`);
    }
  });
}

export async function decideTravelBookingChange(id: string, changeId: string, decision: string, note: string, reference: string, actor: TravelActor) {
  travelAssert(isTravelId(changeId) && ["accept-quote", "cancel", "decline", "approve", "settle", "reverse-adjustment"].includes(decision), "change");
  await db.transaction(async transaction => {
    const tx = transaction as unknown as Database;
    const workspace = await getBookingWorkspace(id, actor, tx, true);
    // Payment settlement locks booking before departure; use the same order.
    const [booking] = await tx.select().from(expeditionBookings).where(eq(expeditionBookings.id, id)).for("update");
    const [change] = await tx.select().from(expeditionBookingChanges)
      .where(and(eq(expeditionBookingChanges.id, changeId), eq(expeditionBookingChanges.bookingId, id))).for("update");
    travelAssert(change && change.status === "pending", "closed");
    if (decision === "cancel") {
      travelAssert(workspace.isOwner && !change.adjustmentConfirmedAt, "permission");
      await tx.update(expeditionBookingChanges).set({ status: "cancelled", updatedAt: new Date() }).where(eq(expeditionBookingChanges.id, changeId));
      return;
    }
    const difference = Math.round((Number(change.quotedAmount) - Number(change.originalAmount)) * 100) / 100;
    if (decision === "reverse-adjustment") {
      travelAssert(workspace.isAdmin && workspace.canHost && change.adjustmentConfirmedAt && difference !== 0 &&
        /^[A-Za-z0-9][A-Za-z0-9_./-]{5,159}$/.test(reference) && reference !== change.adjustmentReference, "adjustment");
      await tx.insert(paymentOperations).values({ operationCode: `TRB-CHANGE-${randomUUID()}`, operationType: "booking_change_adjustment_reversal",
        entityType: "expedition_booking", bookingId: id, requestedByUserId: change.requestedByUserId, processedByUserId: actor.id,
        status: "completed", provider: "manual_external", amount: Math.abs(difference).toFixed(2), currency: change.currency,
        reason: "Verified external reversal of booking change adjustment", metadata: { changeId,
          reconciliationReference: reference, originalReference: change.adjustmentReference, signedDifference: -difference }, processedAt: new Date() });
      await tx.update(expeditionBookingChanges).set({ adjustmentConfirmedAt: null, adjustmentReference: null, updatedAt: new Date() })
        .where(eq(expeditionBookingChanges.id, changeId));
      await audit(tx, actor, "expedition.booking.adjustment_reversed", id, { changeId, reference });
      return;
    }
    if (decision === "decline") {
      travelAssert(workspace.canHost && !change.adjustmentConfirmedAt && note.trim().length >= 5 && note.length <= 1000, "decision");
      await tx.update(expeditionBookingChanges).set({ status: "declined", decisionNote: note.trim(), processedByUserId: actor.id,
        updatedAt: new Date() }).where(eq(expeditionBookingChanges.id, changeId));
      await notify(tx, booking.userId, workspace.trip.title, "Your booking change was declined. Read the host's explanation.", `/expedition-bookings/${id}`);
      await audit(tx, actor, "expedition.booking.change_declined", id, { changeId });
      return;
    }
    travelAssert(canPrepareBooking(booking, workspace.departure.startsAt) && booking.departureId === change.sourceDepartureId &&
      booking.totalAmount === change.originalAmount && booking.currency === change.currency, "stale-change");
    if (decision === "accept-quote") {
      travelAssert(workspace.isOwner, "permission");
      await tx.update(expeditionBookingChanges).set({ quoteAcceptedAt: new Date() }).where(eq(expeditionBookingChanges.id, changeId));
      return;
    }
    travelAssert(workspace.canHost, "permission");
    travelAssert(change.quoteAcceptedAt, "quote-not-accepted");
    if (decision === "settle") {
      travelAssert(workspace.isAdmin && !change.adjustmentConfirmedAt && difference !== 0 &&
        /^[A-Za-z0-9][A-Za-z0-9_./-]{5,159}$/.test(reference), "adjustment");
      await tx.insert(paymentOperations).values({ operationCode: `TRB-CHANGE-${randomUUID()}`, operationType: "booking_change_adjustment", entityType: "expedition_booking",
        bookingId: id, requestedByUserId: change.requestedByUserId, processedByUserId: actor.id,
        status: "completed", provider: "manual_external", amount: Math.abs(difference).toFixed(2), currency: change.currency,
        reason: difference > 0 ? "Verified additional payment for booking change" : "Verified refund for booking change",
        metadata: { changeId, reconciliationReference: reference, signedDifference: difference }, processedAt: new Date() });
      await tx.update(expeditionBookingChanges).set({ adjustmentConfirmedAt: new Date(), adjustmentReference: reference })
        .where(eq(expeditionBookingChanges.id, changeId));
      await audit(tx, actor, "expedition.booking.adjustment_verified", id, { changeId, difference, reference });
      return;
    }
    travelAssert(difference === 0 || change.adjustmentConfirmedAt, "adjustment-required");
    const lockedDepartures = await tx.select().from(expeditionDepartures)
      .where(inArray(expeditionDepartures.id, [...new Set([booking.departureId, change.targetDepartureId])].sort()))
      .orderBy(asc(expeditionDepartures.id)).for("update");
    const target = lockedDepartures.find(item => item.id === change.targetDepartureId);
    const source = lockedDepartures.find(item => item.id === booking.departureId);
    travelAssert(source && target && target.startsAt > new Date() &&
      (target.status === "open" || target.id === source.id && target.status === "full"), "departure");
    const sameDeparture = target.id === source.id;
    const targetSeats = target.seatsBooked - (sameDeparture ? booking.participantsCount : 0) + change.participantsCount;
    const heldSeats = await activeExpeditionHeldSeats(tx, target.id, new Date(), id);
    travelAssert(targetSeats >= 0 && targetSeats + heldSeats <= target.capacity && source.seatsBooked >= booking.participantsCount, "capacity");
    await tx.update(expeditionDepartures).set({ seatsBooked: targetSeats,
      status: departureStatusAfterSeatChange(target.status, target.capacity, targetSeats) }).where(eq(expeditionDepartures.id, target.id));
    if (!sameDeparture) {
      const sourceSeats = source.seatsBooked - booking.participantsCount;
      await tx.update(expeditionDepartures).set({ seatsBooked: sourceSeats,
        status: departureStatusAfterSeatChange(source.status, source.capacity, sourceSeats) }).where(eq(expeditionDepartures.id, source.id));
    }
    const used = new Set<string>();
    const updatedParticipants = change.participantNames.map(fullName => {
      const previous = workspace.participants.find(item => item.fullName === fullName && !used.has(item.id));
      if (previous) used.add(previous.id);
      return { bookingId: id, fullName, email: previous?.email, phone: previous?.phone,
        emergencyContact: previous?.emergencyContact, dietaryNotes: previous?.dietaryNotes };
    });
    await tx.update(expeditionBookings).set({ departureId: target.id, participantsCount: change.participantsCount,
      totalAmount: change.quotedAmount, metadata: { ...objectMetadata(booking.metadata), participantNames: change.participantNames,
        bookingUnitPrice: objectMetadata(booking.metadata).bookingUnitPrice ?? Number(booking.totalAmount) / booking.participantsCount,
        waiverAccepted: "false", emergencyContactComplete: updatedParticipants.every(item => Boolean(item.emergencyContact)) ? "true" : "false",
        equipmentReviewed: "false", briefingCompleted: "false" } })
      .where(eq(expeditionBookings.id, id));
    await tx.delete(expeditionParticipants).where(eq(expeditionParticipants.bookingId, id));
    await tx.insert(expeditionParticipants).values(updatedParticipants);
    await tx.update(expeditionBookingChanges).set({ status: "approved", processedByUserId: actor.id,
      decisionNote: note.trim().slice(0, 1000) || null, updatedAt: new Date() }).where(eq(expeditionBookingChanges.id, changeId));
    await notify(tx, booking.userId, workspace.trip.title, "Your booking change was approved. Complete preparation for the updated trip.", `/expedition-bookings/${id}`);
    await audit(tx, actor, "expedition.booking.change_approved", id, { changeId, sourceDepartureId: source.id, targetDepartureId: target.id });
  });
}
