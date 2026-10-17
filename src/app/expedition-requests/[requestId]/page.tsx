import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserRoles, requireUser } from "@/lib/auth";
import { getRequestWorkspace } from "@/lib/expedition-journeys";
import { TravelError } from "@/lib/expedition-travel";
import { acceptTravelDepartureAction, proposeTravelDepartureAction, sendTravelMessageAction } from "@/lib/expedition-journey-actions";
import { getPreferredLocale } from "@/lib/user-preferences";
import { TravelFeedback } from "@/components/travel-feedback";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Trip conversation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TravelRequestPage({ params, searchParams }: {
  params: Promise<{ requestId: string }>; searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { requestId } = await params;
  const user = await requireUser(`/expedition-requests/${requestId}`);
  const [query, locale, roles] = await Promise.all([searchParams, getPreferredLocale(), getUserRoles(user.id)]);
  const id = locale === "id";
  const t = (en: string, translated: string) => id ? translated : en;
  const data = await getRequestWorkspace(requestId, { id: user.id, roles }).catch(error => {
    if (error instanceof TravelError) notFound(); throw error;
  });
  const proposal = data.departures.find(item => item.id === data.request.proposedDepartureId);
  const closed = ["cancelled", "declined"].includes(data.request.status);
  const date = (value: Date) => value.toLocaleString(id ? "id-ID" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
  return <main className="min-h-screen bg-sand-50 px-4 py-10 text-ocean-900"><div className="mx-auto grid max-w-3xl gap-5">
    <Link href={data.isAdmin ? "/admin/expeditions" : data.canHost ? "/partner/expeditions" : "/dashboard/expeditions"}>← {t("My expeditions", "Ekspedisi saya")}</Link>
    <header><p className="text-sm font-bold text-kelp-700">{data.request.requestCode} · {data.request.status}</p>
      <h1 className="mt-2 text-3xl font-bold">{data.trip.title}</h1><p>{t("Conversation with your host", "Percakapan dengan host")}</p></header>
    <TravelFeedback error={query.error} saved={query.saved} id={id} />
    <section aria-label={t("Conversation", "Percakapan")} className="grid gap-3 rounded-xl border bg-white p-5">
      <p className="text-sm font-bold">{data.request.contactName} · {data.request.participantsCount} {t("travelers", "peserta")}</p>
      {data.request.message && <p className="whitespace-pre-wrap rounded-lg bg-sand-50 p-4">{data.request.message}</p>}
      {data.messages.map(message => <article key={message.id} className={`rounded-lg p-4 ${message.senderRole === "host" ? "bg-ocean-50" : "bg-sand-50"}`}>
        <p className="text-xs font-bold">{message.senderRole === "host" ? t("Host", "Host") : t("Traveler", "Peserta")} · {date(message.createdAt)} WIB</p>
        <p className="mt-2 whitespace-pre-wrap break-words">{message.body}</p>
      </article>)}
      {!closed && data.request.userId && <form action={sendTravelMessageAction} className="grid gap-3">
        <input type="hidden" name="id" value={requestId} /><label className="grid gap-2 font-bold">{t("Message", "Pesan")}
          <textarea name="body" required minLength={1} maxLength={4000} className="min-h-28 rounded-lg border p-3 font-normal" /></label>
        <Button type="submit">{t("Send message", "Kirim pesan")}</Button>
      </form>}
      {!data.request.userId && data.canHost && <p>{t("This request was submitted as a guest. Reply by email:", "Permintaan dikirim sebagai tamu. Balas melalui email:")} <a className="font-bold text-coral-700" href={`mailto:${data.request.contactEmail}`}>{data.request.contactEmail}</a></p>}
    </section>
    {proposal && <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">{t("Proposed departure", "Penawaran keberangkatan")}</h2>
      <p className="mt-3">{date(proposal.startsAt)} – {date(proposal.endsAt)} WIB</p>
      <p className="mt-2 text-sm">{t("Confirming an offer continues to checkout. Availability is checked again; this offer does not hold seats.", "Konfirmasi penawaran untuk melanjutkan ke checkout. Ketersediaan diperiksa ulang; penawaran belum menahan kursi.")}</p>
      {data.isOwner && !closed && <form action={acceptTravelDepartureAction} className="mt-4"><input type="hidden" name="id" value={requestId} /><Button type="submit">{data.request.bookingId ? t("Open booking", "Buka booking") : t("Accept and continue", "Setujui dan lanjutkan")}</Button></form>}
    </section>}
    {data.canHost && !data.request.bookingId && !closed && data.request.userId && <form action={proposeTravelDepartureAction} className="grid gap-3 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-bold">{t("Offer a departure", "Tawarkan keberangkatan")}</h2><input type="hidden" name="id" value={requestId} />
      <label className="grid gap-2">{t("Available departure", "Keberangkatan tersedia")}<select name="departureId" required className="min-h-12 rounded-lg border p-3"><option value="">{t("Choose a departure", "Pilih keberangkatan")}</option>
        {data.departures.filter(item => item.status === "open" && item.startsAt > new Date()).map(item => <option key={item.id} value={item.id}>{date(item.startsAt)} · {item.capacity - item.seatsBooked} {t("seats", "kursi")}</option>)}
      </select></label><Button type="submit">{t("Send offer", "Kirim penawaran")}</Button>
    </form>}
    <Link className="font-bold text-coral-700" href={`/expeditions/${data.trip.slug}`}>{t("View trip details", "Lihat detail perjalanan")}</Link>
  </div></main>;
}
