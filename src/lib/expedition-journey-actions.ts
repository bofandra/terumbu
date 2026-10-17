"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserRoles, requireUser } from "@/lib/auth";
import { acceptTravelDeparture, confirmTravelBriefing, decideTravelBookingChange, postTravelMessage,
  proposeTravelDeparture, requestTravelBookingChange, saveTravelPreparation, type TravelActor } from "@/lib/expedition-journeys";
import { isTravelId, TravelError } from "@/lib/expedition-travel";

async function execute(form: FormData, kind: "requests" | "bookings", operation: (id: string, actor: TravelActor) => Promise<unknown>) {
  const id = String(form.get("id") ?? "");
  const path = isTravelId(id) ? `/expedition-${kind}/${id}` : "/dashboard/expeditions";
  const user = await requireUser(path);
  try {
    if (!isTravelId(id)) throw new TravelError("not-found");
    await operation(id, { id: user.id, roles: await getUserRoles(user.id) });
  } catch (error) {
    if (error instanceof TravelError) redirect(`${path}?error=${error.code}`);
    throw error;
  }
  revalidatePath(path);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/expeditions");
  revalidatePath("/partner/expeditions", "layout");
  redirect(`${path}?saved=1`);
}

export async function sendTravelMessageAction(form: FormData) {
  return execute(form, "requests", (id, actor) => postTravelMessage(id, String(form.get("body") ?? ""), actor));
}

export async function proposeTravelDepartureAction(form: FormData) {
  return execute(form, "requests", (id, actor) => proposeTravelDeparture(id, String(form.get("departureId") ?? ""), actor));
}

export async function acceptTravelDepartureAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  const user = await requireUser(`/expedition-requests/${id}`);
  let path: string;
  try {
    path = await acceptTravelDeparture(id, { id: user.id, roles: await getUserRoles(user.id) });
  } catch (error) {
    if (error instanceof TravelError && isTravelId(id)) redirect(`/expedition-requests/${id}?error=${error.code}`);
    throw error;
  }
  revalidatePath(`/expedition-requests/${id}`);
  redirect(path);
}

export async function saveTravelPreparationAction(form: FormData) {
  return execute(form, "bookings", (id, actor) => saveTravelPreparation(id, form, actor));
}

export async function confirmTravelBriefingAction(form: FormData) {
  return execute(form, "bookings", (id, actor) => confirmTravelBriefing(id, actor));
}

export async function requestTravelBookingChangeAction(form: FormData) {
  return execute(form, "bookings", (id, actor) => requestTravelBookingChange(id, form, actor));
}

export async function decideTravelBookingChangeAction(form: FormData) {
  return execute(form, "bookings", (id, actor) => decideTravelBookingChange(id, String(form.get("changeId") ?? ""),
    String(form.get("decision") ?? ""), String(form.get("note") ?? ""), String(form.get("reference") ?? ""), actor));
}
