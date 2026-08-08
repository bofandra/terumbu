"use server";

import { randomBytes } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  campaigns,
  expeditionDepartures,
  expeditionInterestRequests,
  expeditions,
  organizationUsers,
  roles,
  userRoles
} from "@/db/schema";
import { getSessionUser, requireRole, safeRedirectPath } from "@/lib/auth";
import { buildExpeditionInterestRequestCode, parseParticipantCount } from "@/lib/checkout";
import {
  normalizeExpeditionInterestRequestStatus,
  normalizeExpeditionInterestRequestType
} from "@/lib/expedition-booking-lifecycle";
import { partnerRoleAllows } from "@/lib/partner-permissions";

function randomRequestCode(now = new Date()) {
  return buildExpeditionInterestRequestCode(randomBytes(5).toString("hex").toUpperCase(), now);
}

function formText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function formEmail(formData: FormData, key: string) {
  return formText(formData, key).toLowerCase();
}

function parsePreferredStart(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const date = new Date(raw.includes("T") ? raw : `${raw}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function appendResult(path: string, key: "saved" | "error", code: string) {
  const [withoutHash, hash = ""] = path.split("#", 2);
  const separator = withoutHash.includes("?") ? "&" : "?";

  return `${withoutHash}${separator}${key}=${encodeURIComponent(code)}${hash ? `#${hash}` : ""}`;
}

function adminReturnPath(formData: FormData, fallbackPath: string) {
  const returnTo = formText(formData, "returnTo");

  return returnTo.startsWith("/admin/") && !returnTo.startsWith("//") ? returnTo : fallbackPath;
}

function partnerReturnPath(formData: FormData, fallbackPath: string) {
  const returnTo = formText(formData, "returnTo");

  return returnTo.startsWith("/partner/") && !returnTo.startsWith("//") ? returnTo : fallbackPath;
}

function successCodeForRequestType(requestType: ReturnType<typeof normalizeExpeditionInterestRequestType>, updated = false) {
  if (requestType === "question") {
    return "interest-question";
  }

  return updated ? "interest-updated" : "interest-request";
}

function requestMetadata(input: { requestType: ReturnType<typeof normalizeExpeditionInterestRequestType>; expeditionSlug: string; refreshedAt?: string }) {
  return {
    source: "public_expedition_detail",
    expeditionSlug: input.expeditionSlug,
    channel: input.requestType === "question" ? "question" : input.requestType,
    ...(input.refreshedAt ? { refreshedAt: input.refreshedAt } : {})
  };
}

export async function submitExpeditionInterestRequestAction(formData: FormData) {
  const expeditionId = formText(formData, "expeditionId");
  const departureId = formText(formData, "departureId") || null;
  const requestType = normalizeExpeditionInterestRequestType(formData.get("requestType"));
  const contactName = formText(formData, "contactName");
  const contactEmail = formEmail(formData, "contactEmail");
  const participantsCount = parseParticipantCount(formData.get("participantsCount"));
  const preferredStartAt = parsePreferredStart(formData.get("preferredStartAt"));
  const message = formText(formData, "message") || null;
  const nextPath = safeRedirectPath(formData.get("next"), "/expeditions");
  const user = await getSessionUser();

  if (!expeditionId || !contactName || !contactEmail) {
    redirect(appendResult(nextPath, "error", "interest-invalid"));
  }

  if (requestType === "question" && !message) {
    redirect(appendResult(nextPath, "error", "interest-question-invalid"));
  }

  const [expedition] = await db
    .select({
      id: expeditions.id,
      title: expeditions.title,
      slug: expeditions.slug
    })
    .from(expeditions)
    .where(eq(expeditions.id, expeditionId))
    .limit(1);

  if (!expedition) {
    redirect(appendResult(nextPath, "error", "interest-expedition"));
  }

  if (departureId) {
    const [departure] = await db
      .select({ id: expeditionDepartures.id })
      .from(expeditionDepartures)
      .where(and(eq(expeditionDepartures.id, departureId), eq(expeditionDepartures.expeditionId, expedition.id)))
      .limit(1);

    if (!departure) {
      redirect(appendResult(nextPath, "error", "interest-departure"));
    }
  }

  const [existingRequest] = await db
    .select({ id: expeditionInterestRequests.id })
    .from(expeditionInterestRequests)
    .where(
      and(
        eq(expeditionInterestRequests.expeditionId, expedition.id),
        departureId ? eq(expeditionInterestRequests.departureId, departureId) : isNull(expeditionInterestRequests.departureId),
        eq(expeditionInterestRequests.contactEmail, contactEmail),
        eq(expeditionInterestRequests.requestType, requestType),
        eq(expeditionInterestRequests.status, "pending")
      )
    )
    .limit(1);

  const now = new Date();

  if (existingRequest) {
    await db
      .update(expeditionInterestRequests)
      .set({
        contactName,
        participantsCount,
        preferredStartAt,
        message,
        updatedAt: now,
        metadata: requestMetadata({
          requestType,
          expeditionSlug: expedition.slug,
          refreshedAt: now.toISOString()
        })
      })
      .where(eq(expeditionInterestRequests.id, existingRequest.id));

    redirect(appendResult(nextPath, "saved", successCodeForRequestType(requestType, true)));
  }

  const [request] = await db
    .insert(expeditionInterestRequests)
    .values({
      expeditionId: expedition.id,
      departureId,
      userId: user?.id ?? null,
      requestCode: randomRequestCode(now),
      requestType,
      status: "pending",
      contactName,
      contactEmail,
      participantsCount,
      preferredStartAt,
      message,
      metadata: requestMetadata({ requestType, expeditionSlug: expedition.slug }),
      updatedAt: now
    })
    .returning({ id: expeditionInterestRequests.id, requestCode: expeditionInterestRequests.requestCode });

  await db.insert(adminAuditLogs).values({
    actorUserId: user?.id ?? null,
    action: "expedition_interest_request.created",
    entityType: "expedition_interest_request",
    entityId: request.id,
    metadata: {
      expeditionId: expedition.id,
      departureId,
      requestType,
      participantsCount,
      requestCode: request.requestCode
    }
  });

  redirect(appendResult(nextPath, "saved", successCodeForRequestType(requestType)));
}

export async function processExpeditionInterestRequestAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/expeditions");
  const requestId = formText(formData, "requestId");
  const status = normalizeExpeditionInterestRequestStatus(formData.get("status"));
  const note = formText(formData, "note") || null;
  const returnTo = adminReturnPath(formData, "/admin/expeditions");
  const now = new Date();

  if (!requestId || status === "pending") {
    redirect(appendResult(returnTo, "error", "interest-request-invalid"));
  }

  const [request] = await db
    .update(expeditionInterestRequests)
    .set({
      status,
      processedByUserId: actor.id,
      processedAt: now,
      updatedAt: now,
      metadata: {
        adminNote: note,
        processedAt: now.toISOString()
      }
    })
    .where(eq(expeditionInterestRequests.id, requestId))
    .returning({
      id: expeditionInterestRequests.id,
      expeditionId: expeditionInterestRequests.expeditionId,
      departureId: expeditionInterestRequests.departureId,
      requestCode: expeditionInterestRequests.requestCode,
      requestType: expeditionInterestRequests.requestType
    });

  if (!request) {
    redirect(appendResult(returnTo, "error", "interest-request-missing"));
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: actor.id,
    action: "expedition_interest_request.processed",
    entityType: "expedition_interest_request",
    entityId: request.id,
    metadata: {
      expeditionId: request.expeditionId,
      departureId: request.departureId,
      requestCode: request.requestCode,
      requestType: request.requestType,
      status,
      note
    }
  });

  redirect(appendResult(returnTo, "saved", "interest-request"));
}

export async function processPartnerExpeditionInterestRequestAction(formData: FormData) {
  const actor = await requireRole(["partner", "admin"], "/partner/expeditions");
  const requestId = formText(formData, "requestId");
  const status = normalizeExpeditionInterestRequestStatus(formData.get("status"));
  const note = formText(formData, "note") || null;
  const returnTo = partnerReturnPath(formData, "/partner/expeditions");
  const now = new Date();

  if (!requestId || status === "pending") {
    redirect(appendResult(returnTo, "error", "interest-request-invalid"));
  }

  const [request] = await db
    .select({
      id: expeditionInterestRequests.id,
      expeditionId: expeditionInterestRequests.expeditionId,
      departureId: expeditionInterestRequests.departureId,
      requestCode: expeditionInterestRequests.requestCode,
      requestType: expeditionInterestRequests.requestType,
      organizationId: campaigns.organizationId
    })
    .from(expeditionInterestRequests)
    .innerJoin(expeditions, eq(expeditionInterestRequests.expeditionId, expeditions.id))
    .leftJoin(campaigns, eq(expeditions.relatedCampaignId, campaigns.id))
    .where(eq(expeditionInterestRequests.id, requestId))
    .limit(1);

  if (!request) {
    redirect(appendResult(returnTo, "error", "interest-request-missing"));
  }

  const roleRows = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, actor.id));
  const isAdmin = roleRows.some((role) => role.key === "admin");

  if (!isAdmin) {
    if (!request.organizationId) {
      redirect(appendResult(returnTo, "error", "expedition-campaign-required"));
    }

    const [membership] = await db
      .select({ role: organizationUsers.role })
      .from(organizationUsers)
      .where(and(eq(organizationUsers.userId, actor.id), eq(organizationUsers.organizationId, request.organizationId), eq(organizationUsers.status, "active")))
      .limit(1);

    if (!partnerRoleAllows(membership?.role, "expedition:manage")) {
      redirect(appendResult(returnTo, "error", "partner-permission"));
    }
  }

  await db
    .update(expeditionInterestRequests)
    .set({
      status,
      processedByUserId: actor.id,
      processedAt: now,
      updatedAt: now,
      metadata: {
        partnerNote: note,
        processedAt: now.toISOString(),
        source: "partner_portal"
      }
    })
    .where(eq(expeditionInterestRequests.id, request.id));

  await db.insert(adminAuditLogs).values({
    actorUserId: actor.id,
    action: "partner_expedition_interest_request.processed",
    entityType: "expedition_interest_request",
    entityId: request.id,
    metadata: {
      expeditionId: request.expeditionId,
      departureId: request.departureId,
      requestCode: request.requestCode,
      requestType: request.requestType,
      status,
      note
    }
  });

  redirect(appendResult(returnTo, "saved", "interest-request"));
}
