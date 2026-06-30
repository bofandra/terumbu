"use client";

import { Bookmark, CheckCircle2, HeartHandshake, LockKeyhole, Share2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type DonationMode = "one-time" | "monthly" | "coral";

type CampaignDonationCardProps = {
  campaignSlug: string;
  raisedLabel: string;
  progress: number;
  impactUnit: string;
  impactTarget: number;
  goal: number;
  oneTimeAmounts: number[];
  disabledReason?: string | null;
};

const monthlyAmounts = [25_000, 50_000, 100_000];
const coralPackages = [
  { label: "1 Coral Fragment", amount: 50_000, fragments: 1 },
  { label: "5 Coral Fragments", amount: 250_000, fragments: 5 },
  { label: "10 Coral Fragments", amount: 500_000, fragments: 10 }
];

function impactText(mode: DonationMode, amount: number, goal: number, impactTarget: number, impactUnit: string) {
  if (mode === "monthly") {
    return `${formatCurrency(amount)}/month supports ongoing monitoring, reports, and contributor impact points.`;
  }

  if (mode === "coral") {
    const selectedPackage = coralPackages.find((item) => item.amount === amount);
    const fragments = selectedPackage?.fragments ?? Math.max(1, Math.round(amount / 50_000));

    return `${formatCurrency(amount)} sponsors approximately ${fragments.toLocaleString("id-ID")} coral fragment${fragments === 1 ? "" : "s"} with certificate tracking.`;
  }

  const costPerUnit = goal > 0 && impactTarget > 0 ? goal / impactTarget : 50_000;
  const units = Math.max(1, Math.round(amount / costPerUnit));

  return `${formatCurrency(amount)} can support approximately ${units.toLocaleString("id-ID")} ${impactUnit}.`;
}

function checkoutHref(campaignSlug: string, mode: DonationMode, amount: number) {
  const params = new URLSearchParams({
    campaign: campaignSlug,
    amount: String(amount)
  });

  if (mode !== "one-time") {
    params.set("intent", mode);
  }

  return `/checkout/donation?${params.toString()}`;
}

export function CampaignDonationCard({
  campaignSlug,
  raisedLabel,
  progress,
  impactUnit,
  impactTarget,
  goal,
  oneTimeAmounts,
  disabledReason = null
}: CampaignDonationCardProps) {
  const [mode, setMode] = useState<DonationMode>("one-time");
  const [selectedAmount, setSelectedAmount] = useState(oneTimeAmounts[1] ?? oneTimeAmounts[0] ?? 100_000);
  const [customAmount, setCustomAmount] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const customValue = Number(customAmount.replace(/[^0-9]/g, ""));
  const amount = customValue > 0 ? customValue : selectedAmount;
  const href = checkoutHref(campaignSlug, mode, amount);

  const options = useMemo(() => {
    if (mode === "monthly") {
      return monthlyAmounts.map((monthlyAmount) => ({
        label: `${formatCurrency(monthlyAmount)}/month`,
        amount: monthlyAmount
      }));
    }

    if (mode === "coral") {
      return coralPackages.map((item) => ({
        label: item.label,
        amount: item.amount
      }));
    }

    return oneTimeAmounts.map((oneTimeAmount) => ({
      label: formatCurrency(oneTimeAmount),
      amount: oneTimeAmount
    }));
  }, [mode, oneTimeAmounts]);

  function setDonationMode(nextMode: DonationMode) {
    setMode(nextMode);
    setCustomAmount("");

    if (nextMode === "monthly") {
      setSelectedAmount(monthlyAmounts[1]);
      return;
    }

    if (nextMode === "coral") {
      setSelectedAmount(coralPackages[1].amount);
      return;
    }

    setSelectedAmount(oneTimeAmounts[1] ?? oneTimeAmounts[0] ?? 100_000);
  }

  async function shareCampaign() {
    const nav =
      typeof window !== "undefined"
        ? (window.navigator as Navigator & {
            share?: (data: ShareData) => Promise<void>;
            clipboard?: Clipboard;
          })
        : null;

    if (nav?.share) {
      await nav.share({
        title: "Support this Terumbu campaign",
        url: window.location.href
      });
      return;
    }

    if (nav?.clipboard) {
      await nav.clipboard.writeText(window.location.href);
    }
  }

  const card = (
    <div className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
      <p className="text-2xl font-bold tracking-normal text-ocean-900">Support This Campaign</p>
      <div className="mt-5 grid grid-cols-3 rounded-xl border border-ocean-900/10 bg-sand-50 p-1 text-xs font-bold sm:text-sm">
        {[
          ["one-time", "One-time"],
          ["monthly", "Monthly"],
          ["coral", "Sponsor a Coral"]
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`min-h-10 rounded-lg px-2 transition ${mode === value ? "bg-ocean-900 text-white shadow-sm" : "text-ocean-900/68 hover:bg-white"}`}
            onClick={() => setDonationMode(value as DonationMode)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={`${mode}-${option.amount}-${option.label}`}
            type="button"
            className={`rounded-xl border px-4 py-4 text-left text-sm font-bold transition ${
              selectedAmount === option.amount && customValue === 0
                ? "border-coral-500 bg-coral-100/40 text-ocean-900"
                : "border-ocean-900/10 text-ocean-900 hover:border-coral-500"
            }`}
            onClick={() => {
              setSelectedAmount(option.amount);
              setCustomAmount("");
            }}
          >
            {option.label}
            {mode !== "coral" ? null : <span className="mt-1 block text-xs font-semibold text-ocean-900/56">{formatCurrency(option.amount)}</span>}
          </button>
        ))}
      </div>

      <label className="mt-4 grid gap-2 text-sm font-semibold text-ocean-900">
        Custom Amount
        <input
          inputMode="numeric"
          value={customAmount}
          onChange={(event) => setCustomAmount(event.target.value)}
          placeholder="Enter another amount"
          className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
        />
      </label>

      <div className="mt-5 rounded-xl border border-ocean-900/10 bg-ocean-50 p-4">
        <div className="flex items-start gap-3">
          <HeartHandshake className="mt-0.5 shrink-0 text-coral-500" size={22} aria-hidden="true" />
          <p className="text-sm leading-6 text-ocean-900/76">{impactText(mode, amount, goal, impactTarget, impactUnit)}</p>
        </div>
        {mode === "monthly" ? <p className="mt-3 text-xs font-semibold text-ocean-900/56">Cancel anytime from your dashboard.</p> : null}
      </div>

      {disabledReason ? (
        <div className="mt-5 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">
          {disabledReason}
        </div>
      ) : (
        <Link href={href} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-coral-500 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-coral-700">
          Continue to Donation
        </Link>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-ocean-900/68 transition hover:bg-ocean-50 hover:text-ocean-900"
          onClick={() => setIsSaved((value) => !value)}
        >
          <Bookmark size={16} aria-hidden="true" />
          {isSaved ? "Saved" : "Save Campaign"}
        </button>
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-ocean-900/68 transition hover:bg-ocean-50 hover:text-ocean-900"
          onClick={() => void shareCampaign()}
        >
          <Share2 size={16} aria-hidden="true" />
          Share Campaign
        </button>
      </div>

      <div className="mt-5 grid gap-3 border-t border-ocean-900/10 pt-5 text-sm text-ocean-900/68">
        {[
          [LockKeyhole, "Secure and encrypted payment"],
          [ShieldCheck, "Verified implementing partner"],
          [CheckCircle2, "Transparent project budget"],
          [CheckCircle2, "Regular impact updates"]
        ].map(([Icon, label]) => (
          <span key={label as string} className="inline-flex items-center gap-2">
            <Icon className="text-kelp-500" size={16} aria-hidden="true" />
            {label as string}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {card}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ocean-900/10 bg-white/95 p-3 shadow-[0_-12px_40px_rgba(7,52,63,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ocean-900">{raisedLabel}</p>
            <p className="text-xs font-semibold text-ocean-900/58">{progress}% funded</p>
          </div>
          <Button type="button" disabled={Boolean(disabledReason)} onClick={() => setIsSheetOpen(true)}>
            Donate Now
          </Button>
        </div>
      </div>

      {isSheetOpen ? (
        <div className="fixed inset-0 z-50 bg-ocean-900/54 p-4 lg:hidden">
          <button className="absolute inset-0 h-full w-full cursor-default" aria-label="Close donation selector" type="button" onClick={() => setIsSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-sand-50 p-4">
            <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-ocean-900/18" />
            {card}
          </div>
        </div>
      ) : null}
    </>
  );
}
