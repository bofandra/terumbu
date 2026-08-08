"use client";

import { Heart, HelpCircle, Minus, Plus, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { removeSavedExpeditionAction, saveExpeditionAction } from "@/lib/retention-actions";
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
};

function participantTotal(adults: number, students: number, children: number) {
  return adults + students + children;
}

function checkoutHref(departureId: string | null, participants: number) {
  const params = new URLSearchParams();
  if (departureId) {
    params.set("departure", departureId);
  }
  params.set("participants", String(Math.max(1, participants)));

  return `/checkout/expedition?${params.toString()}`;
}

function Stepper({
  label,
  hint,
  value,
  onChange,
  disabled
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
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
          disabled={disabled || value <= 0}
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
  expeditionPath
}: ExpeditionBookingCardProps) {
  const firstBookableDeparture = departures.find((departure) => departure.status === "open" && departure.availableSeats > 0) ?? departures[0] ?? null;
  const [selectedDepartureId, setSelectedDepartureId] = useState(firstBookableDeparture?.id ?? null);
  const [adults, setAdults] = useState(1);
  const [students, setStudents] = useState(0);
  const [children, setChildren] = useState(0);
  const participants = participantTotal(adults, students, children);
  const selectedDeparture = departures.find((departure) => departure.id === selectedDepartureId) ?? firstBookableDeparture;
  const participantsWithinCapacity = selectedDeparture ? participants <= selectedDeparture.availableSeats : false;
  const bookingDisabled = !selectedDeparture || selectedDeparture.availableSeats <= 0 || !participantsWithinCapacity || selectedDeparture.status !== "open";
  const total = useMemo(() => price * participants + equipmentRental + platformFee, [equipmentRental, participants, platformFee, price]);
  const href = checkoutHref(selectedDeparture?.id ?? null, participants);

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
        <p className="text-sm font-semibold text-ocean-900/58">From</p>
        <p className="mt-1 text-3xl font-bold tracking-normal text-ocean-900">
          {formatCurrency(price)}
          <span className="block text-base font-semibold text-ocean-900/58">per person</span>
        </p>
        <p className="mt-2 text-sm font-semibold text-ocean-900/58">Taxes and conservation contribution included.</p>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-ocean-900">1. Departure</p>
          {selectedDeparture ? (
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", selectedDeparture.availableSeats <= 4 ? "bg-coral-100 text-coral-700" : "bg-kelp-100 text-kelp-700")}>
              {selectedDeparture.availableSeats} seats left
            </span>
          ) : null}
        </div>
        <div className="mt-3 grid gap-2">
          {departures.length > 0 ? (
            departures.map((departure) => (
              <label
                key={departure.id}
                className={cn(
                  "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border p-3 text-sm transition",
                  selectedDepartureId === departure.id ? "border-coral-500 bg-coral-100/35 ring-2 ring-coral-200/70" : "border-ocean-900/12 hover:border-coral-500"
                )}
              >
                <input
                  type="radio"
                  name="departure"
                  value={departure.id}
                  checked={selectedDepartureId === departure.id}
                  onChange={() => setSelectedDepartureId(departure.id)}
                  className="mt-1 size-4 accent-coral-500"
                />
                <span className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <span className="min-w-0">
                    <span className="block font-bold text-ocean-900">{departure.dateRangeLabel}</span>
                    <span className={cn("mt-1 block text-xs font-bold", departure.availableSeats <= 4 ? "text-coral-700" : "text-kelp-700")}>
                      {departure.availableSeats > 0 ? `${departure.availableSeats} places left · ${departure.statusLabel}` : "Full"}
                    </span>
                  </span>
                  <span className="font-bold text-ocean-900 sm:text-right">{formatCurrency(price)}</span>
                </span>
              </label>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-ocean-900/16 bg-sand-50 p-4">
              <p className="font-bold text-ocean-900">No public departures are currently scheduled.</p>
              <Link href="/expeditions" className="mt-2 inline-flex text-sm font-bold text-coral-700">View similar expeditions</Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="font-bold text-ocean-900">2. Participants</p>
        <div className="mt-3 grid gap-3">
          <Stepper label="Adults" hint="16+ years" value={adults} onChange={setAdults} disabled={bookingDisabled && !selectedDeparture} />
          <Stepper label="Students" hint="Student ID required" value={students} onChange={setStudents} disabled={bookingDisabled && !selectedDeparture} />
          <Stepper label="Children" hint="8-15 years" value={children} onChange={setChildren} disabled={bookingDisabled && !selectedDeparture} />
        </div>
        {!participantsWithinCapacity && selectedDeparture ? (
          <p className="mt-3 rounded-xl bg-coral-100 px-3 py-2 text-xs font-bold text-coral-700">
            This departure only has {selectedDeparture.availableSeats} seats available.
          </p>
        ) : null}
      </div>

      <div className="mt-5 border-t border-ocean-900/10 pt-4">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-ocean-900/62">{participants} participants x {formatCurrency(price)}</span>
            <span className="font-bold text-ocean-900">{formatCurrency(price * participants)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ocean-900/62">Equipment rental</span>
            <span className="font-bold text-ocean-900">{formatCurrency(equipmentRental)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ocean-900/62">Platform and payment fees</span>
            <span className="font-bold text-ocean-900">{formatCurrency(platformFee)}</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-ocean-900/10 pt-3 text-lg">
            <span className="font-bold text-ocean-900">Total</span>
            <span className="font-bold text-ocean-900">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {bookingDisabled ? (
        <button type="button" disabled className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-ocean-900/20 px-5 text-sm font-bold text-white">
          Select Available Date
        </button>
      ) : (
        <Link href={href} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-coral-500 px-5 text-sm font-bold text-white shadow-soft hover:bg-coral-700">
          Reserve Your Place
        </Link>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={questionHref ?? "#ask-question"}
          className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-ocean-900/14 px-3 text-sm font-bold text-ocean-900 hover:border-coral-500"
          onClick={onQuestionClick}
        >
          <HelpCircle size={16} aria-hidden="true" />
          Ask a Question
        </Link>
        {isAuthenticated ? (
          <form action={isSaved ? removeSavedExpeditionAction : saveExpeditionAction}>
            <input type="hidden" name="expeditionSlug" value={slug} />
            <input type="hidden" name="next" value={expeditionPath ?? `/expeditions/${slug}`} />
            <button
              type="submit"
              aria-label={isSaved ? "Remove saved expedition" : "Save expedition"}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-coral-700 hover:bg-coral-100"
            >
              <Heart size={16} aria-hidden="true" fill={isSaved ? "currentColor" : "none"} />
              {isSaved ? "Saved" : "Save"}
            </button>
          </form>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(expeditionPath ?? `/expeditions/${slug}`)}`}
            className="flex min-h-10 items-center justify-center gap-2 rounded-full text-sm font-bold text-coral-700 hover:bg-coral-100"
          >
            <Heart size={16} aria-hidden="true" />
            Sign in to Save
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
        {formatCurrency(conservationContribution)} per participant supports the associated conservation program. Seats are held during checkout only.
      </p>
    </aside>
  );
}

export function ExpeditionMobileBookingBar(props: ExpeditionBookingCardProps) {
  const [open, setOpen] = useState(false);
  const firstDeparture = props.departures[0];

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ocean-900/10 bg-white/94 p-3 shadow-soft backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ocean-900/54">From</p>
            <p className="font-bold text-ocean-900">{formatCurrency(props.price)} / person</p>
            <p className="text-xs text-ocean-900/54">{firstDeparture ? `${firstDeparture.dateRangeLabel} · ${firstDeparture.availableSeats} places left` : "Dates pending"}</p>
          </div>
          <button type="button" className="min-h-11 rounded-full bg-coral-500 px-5 text-sm font-bold text-white" onClick={() => setOpen(true)}>
            Check Dates
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 bg-ocean-950/62 p-3 backdrop-blur lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile expedition booking">
          <div className="absolute inset-x-3 bottom-3 max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold text-ocean-900">Reserve expedition seats</p>
              <button type="button" aria-label="Close booking sheet" className="flex size-10 items-center justify-center rounded-full bg-ocean-50" onClick={() => setOpen(false)}>
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <ExpeditionBookingCard {...props} compact onQuestionClick={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
