import { randomBytes } from "node:crypto";

import { AnalyticsEvent } from "@/components/analytics-event";
import { Button, ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { secondaryPriceLabel } from "@/lib/currency-display";
import { bookExpeditionAction } from "@/lib/checkout-actions";
import { getExpeditionCheckoutOptions, getUserCorporateAttributionOptions } from "@/lib/queries";
import { getPreferredDisplayCurrency, getPreferredLocale, localeTag } from "@/lib/user-preferences";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Expedition Checkout"
};

export const dynamic = "force-dynamic";

type ExpeditionCheckoutPageProps = {
  searchParams?: Promise<{
    departure?: string;
    expedition?: string;
    participants?: string;
    error?: string;
    ref?: string;
  }>;
};

export default async function ExpeditionCheckoutPage({ searchParams }: ExpeditionCheckoutPageProps) {
  const params = await searchParams;
  const [options, user, displayCurrency, locale] = await Promise.all([
    getExpeditionCheckoutOptions(),
    getSessionUser(),
    getPreferredDisplayCurrency(),
    getPreferredLocale()
  ]);
  const localeName = localeTag(locale);
  const corporateOptions = user ? await getUserCorporateAttributionOptions(user.id) : [];
  const filteredOptions = params?.expedition ? options.filter((option) => option.expeditionSlug === params.expedition) : options;
  const visibleOptions = filteredOptions.length > 0 ? filteredOptions : options;
  const selectedDeparture = params?.departure ?? visibleOptions[0]?.departureId;
  const selectedOption = visibleOptions.find((option) => option.departureId === selectedDeparture) ?? visibleOptions[0] ?? null;
  const selectedParticipants = Math.max(1, Math.min(12, Number(params?.participants ?? 1) || 1));
  const idempotencyKey = `expedition-${randomBytes(12).toString("hex")}`;
  const labels =
    locale === "id"
      ? {
          unavailable: "Booking belum tersedia",
          noDepartures: "Belum ada jadwal keberangkatan publik.",
          noDeparturesHelp: "Tanggal baru akan muncul setelah ketersediaan operator, persyaratan keselamatan, dan detail mitra konservasi dikonfirmasi.",
          viewExpeditions: "Lihat ekspedisi",
          requestPrivate: "Minta perjalanan privat",
          booking: "Booking",
          title: "Reservasi tempat ekspedisi",
          intro: "Pesan untuk dirimu terlebih dahulu, lalu tambahkan peserta lain jika datang bersama grup. Permintaan booking langsung tercatat; pembayaran tetap berstatus pending sampai verifikasi manual/admin selesai.",
          publishedOnly: "Hanya ekspedisi terpublikasi",
          availabilityCheck: "Ketersediaan dicek ulang saat submit",
          referralPreserved: "Sumber referral dipertahankan",
          errorAvailability: "Keberangkatan tersebut sudah tidak tersedia untuk jumlah peserta yang diminta.",
          errorLearning: "Selesaikan kursus Terumbu Academy yang diwajibkan dan dapatkan sertifikatnya sebelum booking.",
          errorAttribution: "Pilih Personal atau perusahaan tempatmu terdaftar.",
          errorProof: "Unggah bukti pembayaran JPG, PNG, WebP, atau GIF maksimal 1.5 MB.",
          errorGeneric: "Periksa keberangkatan, detail kontak, dan bukti pembayaran.",
          departure: "Keberangkatan",
          seats: "tempat",
          contactName: "Nama kontak",
          contactEmail: "Email kontak",
          participants: "Peserta",
          groupBooking: "Booking grup",
          groupHelp: "Satu lead traveler mengelola booking. Tambahkan detail peserta agar tim lapangan dapat menyiapkan logistik dan dukungan aksesibilitas.",
          groupName: "Nama grup / tim",
          optional: "(opsional)",
          groupPlaceholder: "contoh: Reef Friends Jakarta",
          contactRole: "Peran kontak",
          leadTraveler: "Lead traveler",
          parentGuardian: "Orang tua / wali",
          teamCoordinator: "Koordinator tim",
          corporateCoordinator: "Koordinator corporate",
          joinAs: "Ikut sebagai",
          personal: "Personal",
          personalHelp: "Hanya ditampilkan di impact passport pribadimu.",
          corporateHelp: "Juga dihitung dalam laporan perusahaan ini.",
          participantNames: "Nama peserta tambahan",
          participantNamesPlaceholder: "Satu nama per baris, jika jumlah peserta lebih dari 1",
          participantEmails: "Email peserta tambahan",
          participantEmailsPlaceholder: "Satu email per baris sesuai urutan nama",
          emergency: "Kontak darurat",
          emergencyPlaceholder: "Nama + telepon / WhatsApp",
          dietary: "Catatan makanan",
          dietaryPlaceholder: "Diet, alergi, permintaan halal/vegetarian",
          accessibility: "Catatan aksesibilitas atau mobilitas",
          accessibilityPlaceholder: "Hal yang perlu diketahui tim lapangan untuk mendukung partisipasi yang aman.",
          paymentVerification: "Verifikasi pembayaran",
          paymentHelp: "Selesaikan pembayaran melalui kanal resmi Terumbu, lalu unggah buktinya di sini. Jika belum menerima instruksi pembayaran, hubungi tim Terumbu terlebih dahulu. Tempatmu tetap pending sampai admin memverifikasi pembayaran.",
          requestPayment: "Minta instruksi pembayaran",
          paymentReference: "Referensi pembayaran",
          paymentReferencePlaceholder: "Bank / referensi transfer",
          paymentProof: "Bukti pembayaran",
          submit: "Kirim booking untuk verifikasi"
        }
      : {
          unavailable: "Booking unavailable",
          noDepartures: "No public departures are currently scheduled.",
          noDeparturesHelp: "New expedition dates will appear after operator availability, safety requirements, and conservation partner details are confirmed.",
          viewExpeditions: "View expeditions",
          requestPrivate: "Request private trip",
          booking: "Booking",
          title: "Reserve expedition seats",
          intro: "Book for yourself first, then add other participant names if you are bringing a group. Your booking request is recorded immediately; payment remains pending until the current manual/admin confirmation flow is completed.",
          publishedOnly: "Published expedition only",
          availabilityCheck: "Availability rechecked at submit",
          referralPreserved: "Referral source preserved",
          errorAvailability: "That departure is no longer available for the requested seats.",
          errorLearning: "Complete the required Terumbu Academy course and earn its certificate before booking this expedition.",
          errorAttribution: "Choose Personal or a company you belong to.",
          errorProof: "Upload payment proof as JPG, PNG, WebP, or GIF up to 1.5 MB.",
          errorGeneric: "Check departure availability, contact details, and payment proof.",
          departure: "Departure",
          seats: "seats",
          contactName: "Contact name",
          contactEmail: "Contact email",
          participants: "Participants",
          groupBooking: "Group booking",
          groupHelp: "One lead traveler manages this booking. Add participant details below so the field team can prepare logistics and accessibility support.",
          groupName: "Group / team name",
          optional: "(optional)",
          groupPlaceholder: "e.g. Reef Friends Jakarta",
          contactRole: "Contact role",
          leadTraveler: "Lead traveler",
          parentGuardian: "Parent / guardian",
          teamCoordinator: "Team coordinator",
          corporateCoordinator: "Corporate coordinator",
          joinAs: "Join as",
          personal: "Personal",
          personalHelp: "Only shown in your personal passport.",
          corporateHelp: "Also counted in this company report.",
          participantNames: "Additional participant names",
          participantNamesPlaceholder: "One name per line, only if participants is more than 1",
          participantEmails: "Additional participant emails",
          participantEmailsPlaceholder: "One email per line, matching the names",
          emergency: "Emergency contact",
          emergencyPlaceholder: "Name + phone / WhatsApp",
          dietary: "Dietary notes",
          dietaryPlaceholder: "Diet, allergies, halal/vegetarian requests",
          accessibility: "Accessibility or mobility notes",
          accessibilityPlaceholder: "Anything the field team should know to support safe participation.",
          paymentVerification: "Payment verification",
          paymentHelp: "Complete payment through Terumbu's official external payment channel, then upload the proof here. If you have not received payment instructions yet, contact the Terumbu team first. Your seats remain pending until an admin verifies the payment.",
          requestPayment: "Request payment instructions",
          paymentReference: "Payment reference",
          paymentReferencePlaceholder: "Bank / transfer reference",
          paymentProof: "Payment proof",
          submit: "Submit Booking for Verification"
        };

  if (visibleOptions.length === 0) {
    return (
      <main className="min-h-screen bg-sand-50 px-4 py-12 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.unavailable}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">{labels.noDepartures}</h1>
          <p className="mt-3 text-sm leading-6 text-ocean-900/62">
            {labels.noDeparturesHelp}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href="/expeditions">{labels.viewExpeditions}</ButtonLink>
            <ButtonLink href="mailto:support@terumbu.eco?subject=Private expedition request" tone="secondary">
              {labels.requestPrivate}
            </ButtonLink>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-12 sm:px-6 lg:px-8">
      <AnalyticsEvent
        event="expedition_checkout_started"
        properties={{
          departureId: selectedDeparture ?? null,
          expeditionSlug: selectedOption?.expeditionSlug ?? null,
          participantsCount: selectedParticipants,
          hasReferral: Boolean(params?.ref),
          authenticated: Boolean(user)
        }}
      />
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.booking}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">{labels.title}</h1>
        <p className="mt-3 text-ocean-900/68">
          {labels.intro}
        </p>
        <div className="mt-4 grid gap-2 rounded-xl border border-ocean-900/10 bg-ocean-50 p-4 text-sm font-semibold text-ocean-900/68 sm:grid-cols-3">
          <span>✓ {labels.publishedOnly}</span>
          <span>✓ {labels.availabilityCheck}</span>
          <span>✓ {labels.referralPreserved}</span>
        </div>
        {params?.error ? (
          <p className="mt-4 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
            {params.error === "availability"
              ? labels.errorAvailability
              : params.error === "learning_required"
                ? labels.errorLearning
              : params.error === "attribution"
                ? labels.errorAttribution
                : params.error === "payment_proof"
                  ? labels.errorProof
                  : labels.errorGeneric}
          </p>
        ) : null}
        <form action={bookExpeditionAction} className="mt-6 grid min-w-0 gap-4">
          <input
            type="hidden"
            name="next"
            value={`/checkout/expedition?${new URLSearchParams({
              ...(params?.departure ? { departure: params.departure } : {}),
              participants: String(selectedParticipants),
              ...(params?.expedition ? { expedition: params.expedition } : {}),
              ...(params?.ref ? { ref: params.ref } : {})
            }).toString()}`}
          />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <input type="hidden" name="referralCode" value={params?.ref ?? ""} />
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            {labels.departure}
            <select name="departureId" defaultValue={selectedDeparture} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500">
              {visibleOptions.map((option) => (
                <option key={option.departureId} value={option.departureId}>
                  {option.expeditionTitle} · {option.startsAt.toLocaleDateString(localeName, { dateStyle: "medium" })} · {option.availabilityLabel} · {option.availableSeats} {labels.seats} · {formatCurrency(option.basePrice, option.currency)}{secondaryPriceLabel(option.basePrice, option.currency, displayCurrency, localeName) ? ` · ≈ ${secondaryPriceLabel(option.basePrice, option.currency, displayCurrency, localeName)}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            {labels.contactName}
            <input name="contactName" defaultValue={user?.displayName ?? user?.name ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            {labels.contactEmail}
            <input name="contactEmail" type="email" defaultValue={user?.email ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            {labels.participants}
            <input name="participantsCount" type="number" min={1} max={12} defaultValue={selectedParticipants} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          {selectedParticipants > 1 ? (
            <div className="rounded-2xl border border-kelp-500/20 bg-kelp-100/40 p-4">
              <p className="font-bold text-ocean-900">{labels.groupBooking}</p>
              <p className="mt-1 text-sm leading-6 text-ocean-900/62">
                {labels.groupHelp}
              </p>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              {labels.groupName} <span className="font-normal text-ocean-900/42">{labels.optional}</span>
              <input name="groupName" placeholder={labels.groupPlaceholder} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              {labels.contactRole}
              <select name="contactRole" defaultValue="Lead traveler" className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500">
                <option value="Lead traveler">{labels.leadTraveler}</option>
                <option value="Parent / guardian">{labels.parentGuardian}</option>
                <option value="Team coordinator">{labels.teamCoordinator}</option>
                <option value="Corporate coordinator">{labels.corporateCoordinator}</option>
              </select>
            </label>
          </div>
          {corporateOptions.length > 0 ? (
            <fieldset className="grid gap-2 rounded-2xl border border-ocean-900/10 bg-sand-50 p-4">
              <legend className="text-sm font-bold text-ocean-900">{labels.joinAs}</legend>
              <label className="flex gap-3 rounded-xl bg-white p-3 text-sm font-semibold text-ocean-900 ring-1 ring-ocean-900/10">
                <input type="radio" name="joinAs" value="personal" defaultChecked className="mt-1" />
                <span>
                  <span className="block font-bold">{labels.personal}</span>
                  <span className="block text-xs leading-5 text-ocean-900/58">{labels.personalHelp}</span>
                </span>
              </label>
              {corporateOptions.map((option) => (
                <label key={option.accountId} className="flex gap-3 rounded-xl bg-white p-3 text-sm font-semibold text-ocean-900 ring-1 ring-ocean-900/10">
                  <input type="radio" name="joinAs" value={`corporate:${option.accountId}`} className="mt-1" />
                  <span>
                    <span className="block font-bold">{option.accountName}</span>
                    <span className="block text-xs leading-5 text-ocean-900/58">{labels.corporateHelp}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              {labels.participantNames}
              <textarea name="additionalParticipantNames" placeholder={labels.participantNamesPlaceholder} className="min-h-28 w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              {labels.participantEmails} <span className="font-normal text-ocean-900/42">{labels.optional}</span>
              <textarea name="additionalParticipantEmails" placeholder={labels.participantEmailsPlaceholder} className="min-h-28 w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              {labels.emergency} <span className="font-normal text-ocean-900/42">{labels.optional}</span>
              <input name="emergencyContact" placeholder={labels.emergencyPlaceholder} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              {labels.dietary} <span className="font-normal text-ocean-900/42">{labels.optional}</span>
              <input name="dietaryNotes" placeholder={labels.dietaryPlaceholder} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
            </label>
          </div>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            {labels.accessibility} <span className="font-normal text-ocean-900/42">{labels.optional}</span>
            <textarea name="accessibilityNotes" placeholder={labels.accessibilityPlaceholder} className="min-h-20 w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
          </label>
          <section className="grid gap-4 rounded-2xl border border-ocean-900/10 bg-sand-50 p-4">
            <div>
              <p className="font-bold text-ocean-900">{labels.paymentVerification}</p>
              <p className="mt-1 text-sm leading-6 text-ocean-900/62">
                {labels.paymentHelp}
              </p>
              <a href="mailto:support@terumbu.eco?subject=Expedition payment instructions" className="mt-2 inline-block text-sm font-bold text-coral-700 underline-offset-4 hover:underline">
                {labels.requestPayment}
              </a>
            </div>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              {labels.paymentReference} <span className="font-normal text-ocean-900/42">{labels.optional}</span>
              <input name="paymentReference" placeholder={labels.paymentReferencePlaceholder} className="w-full min-w-0 rounded-xl border border-ocean-900/14 bg-white px-4 py-3 outline-none focus:border-coral-500" />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
              {labels.paymentProof}
              <input name="paymentProofFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="w-full min-w-0 rounded-xl border border-ocean-900/14 bg-white px-4 py-3 text-sm" required />
            </label>
          </section>
          <Button type="submit">{labels.submit}</Button>
        </form>
      </section>
    </main>
  );
}
