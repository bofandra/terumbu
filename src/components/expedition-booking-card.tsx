"use client";

import { ArrowRight, Heart, HelpCircle, Minus, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { MetricValue } from "@/components/ui/metric-value";
import { secondaryPriceLabel } from "@/lib/currency-display";
import { removeSavedExpeditionAction, saveExpeditionAction } from "@/lib/retention-actions";
import type { DisplayCurrency } from "@/lib/user-preferences";
import { cn, formatCurrency } from "@/lib/utils";

type Departure = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  availableSeats: number;
  status: string;
  statusLabel: string;
  dateRangeLabel: string;
};

type ExpeditionBookingCardProps = {
  slug: string;
  price: number;
  currency: string;
  equipmentRental: number;
  platformFee: number;
  departures: Departure[];
  conservationContribution: number;
  trustIndicators: string[];
  compact?: boolean;
  anchorId?: string;
  questionHref?: string;
  onQuestionClick?: () => void;
  isAuthenticated?: boolean;
  isSaved?: boolean;
  expeditionPath?: string;
  referralCode?: string | null;
  displayCurrency?: DisplayCurrency;
  locale?: string;
  academyEligibility?: "not_required" | "eligible" | "learning_required";
  requiredAcademyCourse?: { title: string; slug: string } | null;
};

function participantTotal(adults: number, students: number, children: number) {
  return adults + students + children;
}

function checkoutHref(expeditionSlug: string, departureId: string | null, participants: number, referralCode?: string | null) {
  const params = new URLSearchParams({
    expedition: expeditionSlug,
    participants: String(Math.max(1, participants))
  });
  if (departureId) {
    params.set("departure", departureId);
  }
  if (referralCode) {
    params.set("ref", referralCode);
  }

  return `/checkout/expedition?${params.toString()}`;
}

function Stepper({
  label,
  hint,
  value,
  onChange,
  disabled,
  decreaseDisabled = false
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  decreaseDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-bold text-ocean-900">{label}</p>
        <p className="text-xs font-semibold text-ocean-900/48">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full border border-ocean-900/14 text-ocean-900 transition hover:border-coral-500 disabled:opacity-35"
          disabled={disabled || decreaseDisabled || value <= 0}
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus size={15} aria-hidden="true" />
        </button>
        <span className="w-6 text-center font-bold text-ocean-900">{value}</span>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full border border-ocean-900/14 text-ocean-900 transition hover:border-coral-500 disabled:opacity-35"
          disabled={disabled}
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + 1)}
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function ExpeditionBookingCard({
  slug,
  price,
  currency,
  equipmentRental,
  platformFee,
  departures,
  conservationContribution,
  trustIndicators,
  compact = false,
  anchorId,
  questionHref,
  onQuestionClick,
  isAuthenticated = false,
  isSaved = false,
  expeditionPath,
  referralCode,
  displayCurrency = "USD",
  locale = "en-US",
  academyEligibility = "not_required",
  requiredAcademyCourse = null
}: ExpeditionBookingCardProps) {
  const isIndonesian = locale.toLowerCase().startsWith("id");
  const labels =
    isIndonesian
      ? {
          from: "Mulai dari",
          perPerson: "per orang",
          estimated: "estimasi",
          included: "Pajak dan kontribusi konservasi sudah termasuk.",
          departure: "1. Keberangkatan",
          seatsLeft: "tempat tersisa",
          placesLeft: "tempat tersisa",
          full: "Penuh",
          noDepartures: "Belum ada keberangkatan publik yang dijadwalkan.",
          similar: "Lihat ekspedisi serupa",
          participants: "2. Peserta",
          adults: "Dewasa",
          adultHint: "16+ tahun",
          students: "Pelajar",
          studentHint: "Kartu pelajar diperlukan",
          children: "Anak",
          childHint: "8–15 tahun",
          capacity: "Keberangkatan ini hanya memiliki",
          capacitySuffix: "tempat tersedia.",
          participantWord: "peserta",
          equipment: "Sewa peralatan",
          fees: "Biaya platform dan pembayaran",
          total: "Total",
          learningRequired: "Kursus diwajibkan",
          completeCourse: "Selesaikan kursus",
          selectDate: "Pilih Tanggal Tersedia",
          reserve: "Reservasi / Daftar",
          ask: "Ajukan Pertanyaan",
          removeSavedAria: "Hapus ekspedisi tersimpan",
          saveAria: "Simpan ekspedisi",
          saved: "Tersimpan",
          save: "Simpan",
          signInSave: "Masuk untuk Menyimpan",
          contributionPrefix: "per peserta mendukung program konservasi terkait. Tempat hanya ditahan selama proses checkout."
        }
      : {
          from: "From",
          perPerson: "per person",
          estimated: "estimated",
          included: "Taxes and conservation contribution included.",
          departure: "1. Departure",
          seatsLeft: "seats left",
          placesLeft: "places left",
          full: "Full",
          noDepartures: "No public departures are currently scheduled.",
          similar: "View similar expeditions",
          participants: "2. Participants",
          adults: "Adults",
          adultHint: "16+ years",
          students: "Students",
          studentHint: "Student ID required",
          children: "Children",
          childHint: "8-15 years",
          capacity: "This departure only has",
          capacitySuffix: "seats available.",
          participantWord: "participants",
          equipment: "Equipment rental",
          fees: "Platform and payment fees",
          total: "Total",
          learningRequired: "Learning required",
          completeCourse: "Complete course first",
          selectDate: "Select Available Date",
          reserve: "Reserve / Apply",
          ask: "Ask a Question",
          removeSavedAria: "Remove saved expedition",
          saveAria: "Save expedition",
          saved: "Saved",
          save: "Save",
          signInSave: "Sign in to Save",
          contributionPrefix: "per participant supports the associated conservation program. Seats are held during checkout only."
        };
  const firstBookableDeparture = departures.find((departure) => departure.status === "open" && departure.availableSeats > 0) ?? departures[0] ?? null;
  const [selectedDepartureId, setSelectedDepartureId] = useState(firstBookableDeparture?.id ?? null);
  const [adults, setAdults] = useState(1);
  const [students, setStudents] = useState(0);
  const [children, setChildren] = useState(0);
  const participants = participantTotal(adults, students, children);
  const selectedDeparture = departures.find((departure) => departure.id === selectedDepartureId) ?? firstBookableDeparture;
  const participantsWithinCapacity = selectedDeparture ? participants > 0 && participants <= selectedDeparture.availableSeats : false;
  const bookingDisabled = !selectedDeparture || selectedDeparture.availableSeats <= 0 || !participantsWithinCapacity || selectedDeparture.status !== "open";
  const total = useMemo(() => price * participants + equipmentRental + platformFee, [equipmentRental, participants, platformFee, price]);
  const href = checkoutHref(slug, selectedDeparture?.id ?? null, participants, referralCode);
  const secondaryPrice = secondaryPriceLabel(price, currency, displayCurrency, locale);
  const secondaryTotal = secondaryPriceLabel(total, currency, displayCurrency, locale);

  return (
    <aside
      id={anchorId}
      tabIndex={anchorId ? -1 : undefined}
      className={cn(
        "rounded-2xl border border-ocean-900/10 bg-white p-4 shadow-soft outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral-500 sm:p-5",
        compact ? "" : "lg:sticky lg:top-28"
      )}
    >
      <div className="border-b border-ocean-900/10 pb-4">
        <p className="text-sm font-semibold text-ocean-900/58">{labels.from}</p>
        <MetricValue className="mt-1 text-2xl text-ocean-900 sm:text-3xl">
          {formatCurrency(price, currency)}
          <span className="block text-base font-semibold text-ocean-900/58">{labels.perPerson}</span>
        </MetricValue>
        {secondaryPrice ? <p className="mt-1 text-sm font-bold text-kelp-700">{secondaryPrice} {labels.estimated}</p> : null}
        <p className="mt-2 text-sm font-semibold text-ocean-900/58">{labels.included}</p>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-ocean-900">{labels.departure}</p>
          {selectedDeparture ? (
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", selectedDeparture.availableSeats <= 4 ? "bg-coral-100 text-coral-700" : "bg-kelp-100 text-kelp-700")}>
              {selectedDeparture.availableSeats} {labels.seatsLeft}
            </span>
          ) : null}
        </div>
        <div className="mt-3 grid gap-2">
          {departures.length > 0 ? (
            departures.map((departure) => {
              const isBookable = departure.status === "open" && departure.availableSeats > 0;

              return (
              <label
                key={departure.id}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border p-3 text-sm transition",
                  isBookable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                  selectedDepartureId === departure.id ? "border-coral-500 bg-coral-100/35 ring-2 ring-coral-200/70" : "border-ocean-900/12 hover:border-coral-500"
                )}
              >
                <input
                  type="radio"
                  name="departure"
                  value={departure.id}
                  checked={selectedDepartureId === departure.id}
                  disabled={!isBookable}
                  onChange={() => setSelectedDepartureId(departure.id)}
                  className="mt-1 size-4 accent-coral-500"
                />
                <span className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <span className="min-w-0">
                    <span className="block font-bold text-ocean-900">{departure.dateRangeLabel}</span>
                    <span className={cn("mt-1 block text-xs font-bold", departure.availableSeats <= 4 ? "text-coral-700" : "text-kelp-700")}>
                      {departure.availableSeats > 0 ? `${departure.availableSeats} ${labels.placesLeft} · ${departure.statusLabel}` : labels.full}
                    </span>
                  </span>
                  <span className="min-w-0 break-words font-bold text-ocean-900 [overflow-wrap:anywhere] sm:text-right">{formatCurrency(price, currency)}</span>
                </span>
              </label>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-ocean-900/16 bg-sand-50 p-4">
              <p className="font-bold text-ocean-900">{labels.noDepartures}</p>
              <Link href="/expeditions" className="mt-2 inline-flex text-sm font-bold text-coral-700">{labels.similar}</Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="font-bold text-ocean-900">{labels.participants}</p>
        <div className="mt-3 grid gap-3">
          <Stepper label={labels.adults} hint={labels.adultHint} value={adults} onChange={setAdults} disabled={bookingDisabled && !selectedDeparture} decreaseDisabled={participants <= 1 && adults > 0} />
          <Stepper label={labels.students} hint={labels.studentHint} value={students} onChange={setStudents} disabled={bookingDisabled && !selectedDeparture} decreaseDisabled={participants <= 1 && students > 0} />
          <Stepper label={labels.children} hint={labels.childHint} value={children} onChange={setChildren} disabled={bookingDisabled && !selectedDeparture} decreaseDisabled={participants <= 1 && children > 0} />
        </div>
        {!participantsWithinCapacity && selectedDeparture ? (
          <p className="mt-3 rounded-xl bg-coral-100 px-3 py-2 text-xs font-bold text-coral-700">
            {labels.capacity} {selectedDeparture.availableSeats} {labels.capacitySuffix}
          </p>
        ) : null}
      </div>

      <div className="mt-5 border-t border-ocean-900/10 pt-4">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="min-w-0 text-ocean-900/62">{participants} {labels.participantWord} x {formatCurrency(price, currency)}</span>
            <span className="min-w-0 break-words text-right font-bold text-ocean-900 [overflow-wrap:anywhere]">{formatCurrency(price * participants, currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ocean-900/62">{labels.equipment}</span>
            <span className="min-w-0 break-words text-right font-bold text-ocean-900 [overflow-wrap:anywhere]">{formatCurrency(equipmentRental, currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ocean-900/62">{labels.fees}</span>
            <span className="min-w-0 break-words text-right font-bold text-ocean-900 [overflow-wrap:anywhere]">{formatCurrency(platformFee, currency)}</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-ocean-900/10 pt-3 text-lg">
            <span className="font-bold text-ocean-900">{labels.total}</span>
            <span className="min-w-0 break-words text-right font-bold text-ocean-900 [overflow-wrap:anywhere]">
              {formatCurrency(total, currency)}
              {secondaryTotal ? <span className="mt-0.5 block text-xs font-bold text-kelp-700">{secondaryTotal}</span> : null}
            </span>
          </div>
        </div>
      </div>

      {academyEligibility === "learning_required" && requiredAcademyCourse ? (
        <div className="mt-5 rounded-xl border border-sand-400/40 bg-sand-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/54">{labels.learningRequired}</p><p className="mt-1 font-bold text-ocean-900">{requiredAcademyCourse.title}</p><Link href={"/academy/courses/" + requiredAcademyCourse.slug} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-kelp-500 px-5 text-sm font-bold text-white shadow-soft hover:bg-kelp-700">{labels.completeCourse}</Link></div>
      ) : bookingDisabled ? (
        <button type="button" disabled className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-ocean-900/20 px-5 text-sm font-bold text-white">
          {labels.selectDate}
        </button>
      ) : (
        <Link href={href} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-kelp-500 px-5 text-sm font-bold text-white shadow-soft hover:bg-kelp-700">
          {labels.reserve}
        </Link>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={questionHref ?? "#ask-question"}
          className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-ocean-900/14 px-3 text-sm font-bold text-ocean-900 hover:border-coral-500"
          onClick={onQuestionClick}
        >
          <HelpCircle size={16} aria-hidden="true" />
          {labels.ask}
        </Link>
        {isAuthenticated ? (
          <form action={isSaved ? removeSavedExpeditionAction : saveExpeditionAction}>
            <input type="hidden" name="expeditionSlug" value={slug} />
            <input type="hidden" name="next" value={expeditionPath ?? `/expeditions/${slug}`} />
            <button
              type="submit"
              aria-label={isSaved ? labels.removeSavedAria : labels.saveAria}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-coral-700 hover:bg-coral-100"
            >
              <Heart size={16} aria-hidden="true" fill={isSaved ? "currentColor" : "none"} />
              {isSaved ? labels.saved : labels.save}
            </button>
          </form>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(expeditionPath ?? `/expeditions/${slug}`)}`}
            className="flex min-h-10 items-center justify-center gap-2 rounded-full text-sm font-bold text-coral-700 hover:bg-coral-100"
          >
            <Heart size={16} aria-hidden="true" />
            {labels.signInSave}
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ocean-900/10 pt-4 text-xs font-bold text-ocean-900/64">
        {trustIndicators.map((item) => (
          <span key={item} className="flex min-h-8 items-center gap-2 rounded-full bg-kelp-100/55 px-2.5 py-1">
            <ShieldCheck size={14} aria-hidden="true" className="shrink-0 text-kelp-500" />
            {item}
          </span>
        ))}
      </div>
      <p className="mt-4 border-t border-ocean-900/10 pt-4 text-xs font-semibold leading-5 text-ocean-900/62">
        {formatCurrency(conservationContribution, currency)} {labels.contributionPrefix}
      </p>
    </aside>
  );
}

export function ExpeditionMobileBookingBar(props: ExpeditionBookingCardProps) {
  const bookableDeparture = props.departures.find((departure) => departure.status === "open" && departure.availableSeats > 0) ?? null;
  const firstDeparture = bookableDeparture ?? props.departures[0] ?? null;
  const isIndonesian = (props.locale ?? "en-US").toLowerCase().startsWith("id");
  const secondaryPrice = secondaryPriceLabel(props.price, props.currency, props.displayCurrency ?? "USD", props.locale ?? "en-US");

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ocean-900/10 bg-white/96 p-3 shadow-soft backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ocean-900/54">{isIndonesian ? "Mulai dari" : "From"}</p>
          <p className="min-w-0 break-words font-bold text-ocean-900 [overflow-wrap:anywhere]">
            {formatCurrency(props.price, props.currency)} / {isIndonesian ? "orang" : "person"}
          </p>
          {secondaryPrice ? (
            <p className="text-xs font-bold text-kelp-700">
              {secondaryPrice} {isIndonesian ? "estimasi" : "estimated"}
            </p>
          ) : null}
          <p className="truncate text-xs text-ocean-900/54">
            {firstDeparture
              ? `${firstDeparture.dateRangeLabel} · ${firstDeparture.availableSeats} ${isIndonesian ? "tempat tersisa" : "places left"}`
              : isIndonesian
                ? "Tanggal belum tersedia"
                : "Dates pending"}
          </p>
        </div>
        {props.academyEligibility === "learning_required" && props.requiredAcademyCourse ? (
          <Link href={"/academy/courses/" + props.requiredAcademyCourse.slug} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-kelp-500 px-5 text-sm font-bold text-white shadow-soft">
            {isIndonesian ? "Selesaikan kursus" : "Complete course first"}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        ) : bookableDeparture ? (
          <a href="#availability" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-kelp-500 px-5 text-sm font-bold text-white shadow-soft">
            {isIndonesian ? "Pilih tanggal" : "Reserve / Apply"}
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        ) : (
          <a href={props.questionHref ?? "#ask-question"} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-ocean-900 px-5 text-sm font-bold text-white shadow-soft">
            {isIndonesian ? "Tanya jadwal" : "Ask about dates"}
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
