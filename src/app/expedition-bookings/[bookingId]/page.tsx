import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserRoles, requireUser } from "@/lib/auth";
import { getBookingWorkspace } from "@/lib/expedition-journeys";
import { canPrepareBooking, objectMetadata, TravelError } from "@/lib/expedition-travel";
import { confirmTravelBriefingAction, decideTravelBookingChangeAction, requestTravelBookingChangeAction, saveTravelPreparationAction } from "@/lib/expedition-journey-actions";
import { getPreferredLocale } from "@/lib/user-preferences";
import { formatCurrency } from "@/lib/utils";
import { TravelFeedback } from "@/components/travel-feedback";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Manage trip", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
const field = "min-h-11 w-full rounded-lg border border-ocean-900/20 bg-white p-3";

export default async function TravelBookingPage({ params, searchParams }: {
  params: Promise<{ bookingId: string }>; searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { bookingId } = await params;
  const user = await requireUser(`/expedition-bookings/${bookingId}`);
  const [query, locale, roles] = await Promise.all([searchParams, getPreferredLocale(), getUserRoles(user.id)]);
  const id = locale === "id";
  const t = (en: string, translated: string) => id ? translated : en;
  const data = await getBookingWorkspace(bookingId, { id: user.id, roles }).catch(error => {
    if (error instanceof TravelError) notFound(); throw error;
  });
  const meta = objectMetadata(data.booking.metadata);
  const canPrepare = canPrepareBooking(data.booking, data.departure.startsAt);
  const pending = data.changes.some(change => change.status === "pending");
  const date = (value: Date) => value.toLocaleString(id ? "id-ID" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
  const money = (value: string | number) => formatCurrency(Number(value), data.booking.currency);
  const checklist = [
    [t("Participation requirements acknowledged", "Persyaratan partisipasi disetujui"), meta.waiverAccepted === "true"],
    [t("Emergency contacts complete", "Kontak darurat lengkap"), data.participants.length === data.booking.participantsCount && data.participants.every(item => Boolean(item.emergencyContact))],
    [t("Equipment list reviewed", "Daftar perlengkapan diperiksa"), meta.equipmentReviewed === "true"],
    [t("Briefing confirmed by host", "Briefing dikonfirmasi host"), meta.briefingCompleted === "true"]
  ] as const;
  return <main className="min-h-screen bg-sand-50 px-4 py-10 text-ocean-900"><div className="mx-auto grid max-w-3xl gap-5">
    <Link href={data.isAdmin ? "/admin/expeditions" : data.canHost ? "/partner/expeditions" : "/dashboard/expeditions"}>← {t("Expeditions", "Ekspedisi")}</Link>
    <header><p className="font-bold text-kelp-700">{data.booking.bookingCode} · {data.booking.status}</p><h1 className="mt-2 text-3xl font-bold">{data.trip.title}</h1>
      <p className="mt-2">{date(data.departure.startsAt)} – {date(data.departure.endsAt)} WIB</p><p>{data.booking.participantsCount} {t("travelers", "peserta")} · {money(data.booking.totalAmount)}</p></header>
    <TravelFeedback error={query.error} saved={query.saved} id={id} />
    <section className="grid gap-4 rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">{t("Before you go", "Persiapan keberangkatan")}</h2>
      <p role="status">{!canPrepare ? t("Preparation record", "Catatan persiapan") : checklist.every(([, done]) => done) ? t("Ready for departure", "Siap berangkat") : t("Preparation incomplete", "Persiapan belum lengkap")}</p>
      <ul className="grid gap-2">{checklist.map(([label, done]) => <li key={label}>{done ? "✓" : "○"} {label}</li>)}</ul>
      <Link className="font-bold text-coral-700" href={`/expeditions/${data.trip.slug}`}>{t("Read trip requirements and equipment list", "Baca persyaratan perjalanan dan daftar perlengkapan")}</Link>
      {data.isOwner && canPrepare && <form action={saveTravelPreparationAction} className="grid gap-4 border-t pt-4">
        <input type="hidden" name="id" value={bookingId} />
        {data.participants.map(participant => <label key={participant.id} className="grid gap-2 font-bold">{participant.fullName} — {t("emergency contact (name and phone)", "kontak darurat (nama dan telepon)")}
          <input name={`emergency:${participant.id}`} required minLength={7} maxLength={220} defaultValue={participant.emergencyContact ?? ""} className={field} /></label>)}
        <label className="flex gap-3"><input type="checkbox" name="requirementsAccepted" defaultChecked={meta.waiverAccepted === "true"} />{t("I have read and acknowledge the trip's participation requirements.", "Saya telah membaca dan menyetujui persyaratan partisipasi perjalanan ini.")}</label>
        <label className="flex gap-3"><input type="checkbox" name="equipmentReviewed" defaultChecked={meta.equipmentReviewed === "true"} />{t("I have reviewed the equipment list.", "Saya sudah memeriksa daftar perlengkapan.")}</label>
        <Button type="submit">{t("Save preparation", "Simpan persiapan")}</Button>
      </form>}
      {data.canHost && canPrepare && <form action={confirmTravelBriefingAction}><input type="hidden" name="id" value={bookingId} /><p className="mb-3 text-sm">{t("Confirm only after the travelers have attended the briefing.", "Konfirmasi setelah peserta mengikuti briefing.")}</p><Button type="submit">{t("Confirm briefing completed", "Konfirmasi briefing selesai")}</Button></form>}
      {data.canHost && <ul>{data.participants.map(participant => <li key={participant.id} className="mt-2 break-words">{participant.fullName}: {participant.emergencyContact ?? t("Emergency contact missing", "Kontak darurat belum diisi")}</li>)}</ul>}
    </section>
    {data.isOwner && canPrepare && !pending && <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">{t("Request a booking change", "Ajukan perubahan booking")}</h2>
      <p className="mt-2 text-sm">{t("Your current booking remains valid until your host approves. Changes to traveler count are quoted at your original per-person rate; any difference requires your acceptance and finance verification.", "Booking awal tetap berlaku sampai host menyetujui. Perubahan jumlah peserta memakai tarif awal per orang; selisih harga perlu persetujuanmu dan verifikasi Admin.")}</p>
      <form action={requestTravelBookingChangeAction} className="mt-4 grid gap-3"><input type="hidden" name="id" value={bookingId} />
        <label className="grid gap-2">{t("Departure", "Keberangkatan")}<select name="departureId" className={field} defaultValue={data.booking.departureId} required>{data.departures.filter(item => item.startsAt > new Date() && (item.status === "open" || item.id === data.booking.departureId && item.status === "full")).map(item => <option key={item.id} value={item.id}>{date(item.startsAt)} WIB</option>)}</select></label>
        <label className="grid gap-2">{t("Travelers", "Jumlah peserta")}<input name="participantsCount" type="number" min="1" max="12" required defaultValue={data.booking.participantsCount} className={field} /></label>
        <label className="grid gap-2">{t("Full names — one per line", "Nama lengkap — satu per baris")}<textarea name="participantNames" required className={`${field} min-h-28`} defaultValue={data.participants.map(item => item.fullName).join("\n")} /></label>
        <label className="grid gap-2">{t("Reason", "Alasan")}<textarea name="reason" required minLength={5} maxLength={1000} className={field} /></label>
        <Button type="submit">{t("Request change", "Ajukan perubahan")}</Button>
      </form>
    </section>}
    <section className="grid gap-4"><h2 className="text-xl font-bold">{t("Booking change history", "Riwayat perubahan booking")}</h2>
      {data.changes.length === 0 && <p>{t("No changes requested.", "Belum ada permintaan perubahan.")}</p>}
      {data.changes.map(change => {
        const target = data.departures.find(item => item.id === change.targetDepartureId);
        const difference = Number(change.quotedAmount) - Number(change.originalAmount);
        return <article key={change.id} className="grid gap-3 rounded-xl border bg-white p-5">
          <p className="font-bold">{change.status} · {target ? date(target.startsAt) : "—"} WIB · {change.participantsCount} {t("travelers", "peserta")}</p>
          <p>{change.participantNames.join(", ")}</p><p className="whitespace-pre-wrap">{change.reason}</p>
          <p>{t("New total", "Total baru")}: {money(change.quotedAmount)} · {t("Difference", "Selisih")}: {money(difference)}</p>
          {change.decisionNote && <p className="whitespace-pre-wrap">{change.decisionNote}</p>}
          {change.status === "pending" && <>
            <p className="text-sm">{!change.quoteAcceptedAt ? t("Waiting for traveler to accept the quote.", "Menunggu peserta menyetujui harga.") : difference !== 0 && !change.adjustmentConfirmedAt ? t("Waiting for verified additional payment / refund.", "Menunggu verifikasi pembayaran tambahan / refund.") : t("Waiting for host approval.", "Menunggu persetujuan host.")}</p>
            {data.isOwner && <form action={decideTravelBookingChangeAction} className="flex flex-wrap gap-3"><input type="hidden" name="id" value={bookingId} /><input type="hidden" name="changeId" value={change.id} />
              {!change.quoteAcceptedAt && <Button type="submit" name="decision" value="accept-quote">{t("Accept quote", "Setujui harga")}</Button>}
              {!change.adjustmentConfirmedAt && <Button tone="secondary" type="submit" name="decision" value="cancel">{t("Cancel request", "Batalkan permintaan")}</Button>}
            </form>}
            {data.canHost && <form action={decideTravelBookingChangeAction} className="grid gap-3"><input type="hidden" name="id" value={bookingId} /><input type="hidden" name="changeId" value={change.id} />
              <label className="grid gap-2">{t("Decision note", "Catatan keputusan")}<textarea name="note" maxLength={1000} className={field} /></label>
              <div className="flex flex-wrap gap-3"><Button type="submit" name="decision" value="approve" disabled={!change.quoteAcceptedAt || difference !== 0 && !change.adjustmentConfirmedAt}>{t("Approve change", "Setujui perubahan")}</Button>
                {!change.adjustmentConfirmedAt && <Button type="submit" tone="secondary" name="decision" value="decline">{t("Decline", "Tolak")}</Button>}</div>
            </form>}
            {data.isAdmin && difference !== 0 && !change.adjustmentConfirmedAt && change.quoteAcceptedAt && <form action={decideTravelBookingChangeAction} className="grid gap-3 border-t pt-3"><input type="hidden" name="id" value={bookingId} /><input type="hidden" name="changeId" value={change.id} />
              <p className="text-sm">{t("After verifying the external payment or refund, record its reconciliation reference. This does not charge or refund through a gateway.", "Setelah memverifikasi pembayaran atau refund eksternal, catat referensi rekonsiliasinya. Tindakan ini tidak melakukan penagihan atau refund melalui gateway.")}</p>
              <label className="grid gap-2">{t("Reconciliation reference", "Referensi rekonsiliasi")}<input name="reference" minLength={6} maxLength={160} required pattern="[A-Za-z0-9][A-Za-z0-9_./-]{5,159}" className={field} /></label>
              <Button type="submit" name="decision" value="settle">{t("Record verified adjustment", "Catat penyesuaian terverifikasi")}</Button>
            </form>}
            {data.isAdmin && change.adjustmentConfirmedAt && <form action={decideTravelBookingChangeAction} className="grid gap-3 border-t pt-3"><input type="hidden" name="id" value={bookingId} /><input type="hidden" name="changeId" value={change.id} />
              <p className="text-sm">{t("If the change cannot proceed, first reverse the external adjustment and verify it. Record the new reconciliation reference to allow cancellation or rejection.", "Jika perubahan tidak dapat dilanjutkan, kembalikan penyesuaian dana dan verifikasi hasilnya. Catat referensi rekonsiliasi baru agar permintaan dapat dibatalkan atau ditolak.")}</p>
              <label className="grid gap-2">{t("Reversal reconciliation reference", "Referensi rekonsiliasi pengembalian")}<input name="reference" minLength={6} maxLength={160} required pattern="[A-Za-z0-9][A-Za-z0-9_./-]{5,159}" className={field} /></label>
              <Button type="submit" name="decision" value="reverse-adjustment">{t("Record verified reversal", "Catat pengembalian terverifikasi")}</Button>
            </form>}
          </>}
        </article>;
      })}
    </section>
  </div></main>;
}
