import Link from "next/link";
import { getUserRoles, requireUser } from "@/lib/auth";
import { getPendingTravelChanges } from "@/lib/expedition-journeys";
import { TravelError } from "@/lib/expedition-travel";

export async function ExpeditionBookingChangeInbox({ expeditionId }: { expeditionId: string }) {
  const user = await requireUser("/partner/expeditions");
  const requests = await getPendingTravelChanges(expeditionId, { id: user.id, roles: await getUserRoles(user.id) }).catch(error => {
    if (error instanceof TravelError && error.code === "permission") return [];
    throw error;
  });
  if (!requests.length) return null;
  return <section className="grid gap-3 rounded-xl border border-coral-700/20 bg-sand-50 p-5">
    <h2 className="text-xl font-bold text-ocean-900">Booking changes awaiting review ({requests.length})</h2>
    {requests.map(request => <Link key={request.id} href={`/expedition-bookings/${request.bookingId}`} className="rounded-lg border bg-white p-3 text-sm font-bold text-coral-700">
      {request.bookingCode} · {request.contactName} · {!request.quoteAcceptedAt ? "Awaiting traveler quote acceptance" : Number(request.originalAmount) !== Number(request.quotedAmount) && !request.adjustmentConfirmedAt ? "Awaiting finance verification" : "Ready for host review"}
    </Link>)}
  </section>;
}
