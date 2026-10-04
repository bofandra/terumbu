"use client";

import { Bookmark, CheckCircle2, HeartHandshake, LockKeyhole, Share2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { calculateDonationImpact, currencyMinorStep, formatImpactQuantity, minimumDonationAmount, type CampaignImpactLineInput } from "@/lib/impact-calculations";
import { removeSavedCampaignAction, saveCampaignAction } from "@/lib/retention-actions";
import type { SupportedLocale } from "@/lib/user-preferences";
import { formatCurrency } from "@/lib/utils";

type DonationMode = "one-time" | "coral";
type ShareStatus = "idle" | "copied" | "shared" | "error";

type CampaignDonationCardProps = {
  campaignSlug: string;
  raisedLabel: string;
  progress: number;
  impactUnit: string;
  impactTarget: number;
  impactUnitCost?: string | number | null;
  impactTargets?: CampaignImpactLineInput[] | null;
  goal: number;
  currency: string;
  carbonKgPerUsd?: number | null;
  oneTimeAmounts: number[];
  disabledReason?: string | null;
  isAuthenticated?: boolean;
  isSaved?: boolean;
  campaignPath?: string;
  locale?: SupportedLocale;
};

function roundedCurrency(value: number, currency: string) {
  const step = currencyMinorStep(currency);

  return Math.max(step, Math.round(value / step) * step);
}

function impactText(
  mode: DonationMode,
  amount: number,
  currency: string,
  goal: number,
  impactTarget: number,
  impactUnit: string,
  impactUnitCost: string | number | null | undefined,
  impactTargets: CampaignImpactLineInput[] | null | undefined,
  carbonKgPerUsd: number | null | undefined,
  locale: SupportedLocale
) {
  const impact = calculateDonationImpact({
    amount,
    currency,
    campaign: {
      goalAmount: goal,
      impactTarget,
      impactUnit,
      impactUnitCost,
      impactTargets
    },
    carbonKgPerUsd
  });
  const activeBreakdown = impact.impactBreakdown.filter((line) => line.unitCount > 0);
  const impactLabel =
    activeBreakdown.length > 1
      ? activeBreakdown
          .slice(0, 3)
          .map((line) => `${formatImpactQuantity(line.unitCount)} ${line.unit}`)
          .join(" + ")
      : impact.impactUnitCount > 0
        ? `${formatImpactQuantity(impact.impactUnitCount)} ${impact.impactUnit}`
        : locale === "id" ? `target ${impactUnit} ini` : `this ${impactUnit} target`;
  const hasCarbonLine = activeBreakdown.some((line) => line.impactType === "carbon");
  const carbonLabel = hasCarbonLine
    ? ""
    : impact.carbonKg == null
      ? locale === "id"
        ? "Perhitungan karbon menunggu konfigurasi admin."
        : "Carbon calculation is pending admin setup."
      : locale === "id"
        ? `${formatImpactQuantity(impact.carbonKg)} kg CO2e terhitung.`
        : `${formatImpactQuantity(impact.carbonKg)} kg CO2e calculated.`;

  if (mode === "coral") {
    return locale === "id"
      ? `${formatCurrency(amount, currency)} dapat mensponsori sekitar ${impactLabel}.${carbonLabel ? ` ${carbonLabel}` : ""}`
      : `${formatCurrency(amount, currency)} sponsors approximately ${impactLabel}.${carbonLabel ? ` ${carbonLabel}` : ""}`;
  }

  return locale === "id"
    ? `${formatCurrency(amount, currency)} dapat mendukung sekitar ${impactLabel}.${carbonLabel ? ` ${carbonLabel}` : ""}`
    : `${formatCurrency(amount, currency)} can support approximately ${impactLabel}.${carbonLabel ? ` ${carbonLabel}` : ""}`;
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

function isAbortError(error: unknown) {
  return (error as { name?: string } | null)?.name === "AbortError";
}

async function writeTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "-9999px";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Copy command was rejected.");
  }
}

export function CampaignDonationCard({
  campaignSlug,
  raisedLabel,
  progress,
  impactUnit,
  impactTarget,
  impactUnitCost,
  impactTargets = null,
  goal,
  currency,
  carbonKgPerUsd = null,
  oneTimeAmounts,
  disabledReason = null,
  isAuthenticated = false,
  isSaved = false,
  campaignPath = `/campaigns/${campaignSlug}`,
  locale = "en"
}: CampaignDonationCardProps) {
  const labels =
    locale === "id"
      ? {
          title: "Dukung Kampanye Ini",
          oneTime: "Sekali donasi",
          sponsor: "Sponsor dampak",
          otherAmount: "Nominal lain",
          otherHelp: "Masukkan nominal berbeda",
          customAmount: "Nominal khusus",
          customPlaceholder: "Masukkan nominal lain",
          preview: "Masukkan nominal untuk melihat perkiraan dampak.",
          continue: "Lanjut ke Donasi",
          minimum: "Minimum",
          saved: "Tersimpan",
          save: "Simpan Kampanye",
          removeSavedAria: "Hapus kampanye tersimpan",
          saveAria: "Simpan kampanye",
          signInSave: "Masuk untuk Menyimpan",
          linkCopied: "Tautan Disalin",
          shared: "Dibagikan",
          copyFailed: "Gagal Menyalin",
          share: "Bagikan Kampanye",
          shareTitle: "Dukung kampanye Terumbu ini",
          shareText: "Lihat kampanye konservasi ini di Terumbu.eco.",
          paymentOutside: "Pembayaran dilakukan di luar website",
          verifiedPartner: "Mitra pelaksana terverifikasi",
          transparentBudget: "Anggaran proyek transparan",
          proofVerification: "Bukti pembayaran diverifikasi manual",
          funded: "terdanai",
          donateNow: "Donasi Sekarang",
          closeSelector: "Tutup pilihan donasi"
        }
      : {
          title: "Support This Campaign",
          oneTime: "One-time",
          sponsor: "Sponsor impact",
          otherAmount: "Other amount",
          otherHelp: "Enter another amount",
          customAmount: "Custom Amount",
          customPlaceholder: "Enter another amount",
          preview: "Enter an amount to preview your impact.",
          continue: "Continue to Donation",
          minimum: "Minimum",
          saved: "Saved",
          save: "Save Campaign",
          removeSavedAria: "Remove saved campaign",
          saveAria: "Save campaign",
          signInSave: "Sign in to Save",
          linkCopied: "Link Copied",
          shared: "Shared",
          copyFailed: "Copy Failed",
          share: "Share Campaign",
          shareTitle: "Support this Terumbu campaign",
          shareText: "View this conservation campaign on Terumbu.eco.",
          paymentOutside: "Payment happens outside the website",
          verifiedPartner: "Verified implementing partner",
          transparentBudget: "Transparent project budget",
          proofVerification: "Manual proof verification",
          funded: "funded",
          donateNow: "Donate Now",
          closeSelector: "Close donation selector"
        };

  const minimumAmount = minimumDonationAmount(currency);
  const fallbackAmount = roundedCurrency(Math.max(1, goal) * 0.0005, currency);
  const [mode, setMode] = useState<DonationMode>("one-time");
  const [selectedAmount, setSelectedAmount] = useState(oneTimeAmounts[1] ?? oneTimeAmounts[0] ?? fallbackAmount);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustomAmountSelected, setIsCustomAmountSelected] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const shareResetTimer = useRef<number | null>(null);
  const customValue = Number(customAmount.replace(/[^0-9.]/g, ""));
  const amount = isCustomAmountSelected ? customValue : selectedAmount;
  const hasValidDonationAmount = amount >= minimumAmount;
  const href = checkoutHref(campaignSlug, mode, amount);
  const previewImpact = calculateDonationImpact({
    amount: selectedAmount,
    currency,
    campaign: { goalAmount: goal, impactTarget, impactUnit, impactUnitCost, impactTargets }
  });
  const costPerUnit = previewImpact.unitCost || selectedAmount;
  const packageUnit = previewImpact.impactUnit || impactUnit;
  const impactPackages = useMemo(
    () =>
      [1, 5, 10].map((units) => ({
        label: `${units.toLocaleString(locale === "id" ? "id-ID" : "en-US")} ${packageUnit}`,
        amount: roundedCurrency(costPerUnit * units, currency)
      })),
    [costPerUnit, currency, packageUnit]
  );

  const options = useMemo(() => {
    if (mode === "coral") {
      return impactPackages;
    }

    return oneTimeAmounts.map((oneTimeAmount) => ({
      label: formatCurrency(oneTimeAmount, currency),
      amount: oneTimeAmount
    }));
  }, [currency, impactPackages, mode, oneTimeAmounts]);

  useEffect(() => {
    return () => {
      if (shareResetTimer.current) {
        window.clearTimeout(shareResetTimer.current);
      }
    };
  }, []);

  function setDonationMode(nextMode: DonationMode) {
    setMode(nextMode);
    setCustomAmount("");
    setIsCustomAmountSelected(false);

    if (nextMode === "coral") {
      setSelectedAmount(impactPackages[1]?.amount ?? impactPackages[0]?.amount ?? selectedAmount);
      return;
    }

    setSelectedAmount(oneTimeAmounts[1] ?? oneTimeAmounts[0] ?? fallbackAmount);
  }

  function resetShareStatusSoon() {
    if (shareResetTimer.current) {
      window.clearTimeout(shareResetTimer.current);
    }

    shareResetTimer.current = window.setTimeout(() => setShareStatus("idle"), 1800);
  }

  async function shareCampaign() {
    if (typeof window === "undefined") {
      return;
    }

    const nav = window.navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    const shareUrl = new URL(campaignPath, window.location.origin).toString();
    const shareData = {
      title: labels.shareTitle,
      text: labels.shareText,
      url: shareUrl
    };

    try {
      if (nav.share) {
        try {
          if (!nav.canShare || nav.canShare(shareData)) {
            await nav.share(shareData);
            setShareStatus("shared");
            resetShareStatusSoon();
            return;
          }
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }
        }
      }

      await writeTextToClipboard(shareUrl);
      setShareStatus("copied");
      resetShareStatusSoon();
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setShareStatus("error");
      resetShareStatusSoon();
    }
  }

  const shareLabel =
    shareStatus === "copied"
      ? labels.linkCopied
      : shareStatus === "shared"
        ? labels.shared
        : shareStatus === "error"
          ? labels.copyFailed
          : labels.share;

  const card = (
    <div className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
      <p className="text-2xl font-bold tracking-normal text-ocean-900">{labels.title}</p>
      <div className="mt-5 grid grid-cols-2 rounded-xl border border-ocean-900/10 bg-sand-50 p-1 text-xs font-bold sm:text-sm">
        {[
          ["one-time", labels.oneTime],
          ["coral", labels.sponsor]
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
            className={`min-w-0 rounded-xl border px-4 py-4 text-left text-sm font-bold transition [overflow-wrap:anywhere] ${
              selectedAmount === option.amount && !isCustomAmountSelected
                ? "border-coral-500 bg-coral-100/40 text-ocean-900"
                : "border-ocean-900/10 text-ocean-900 hover:border-coral-500"
            }`}
            onClick={() => {
              setSelectedAmount(option.amount);
              setCustomAmount("");
              setIsCustomAmountSelected(false);
            }}
          >
            {option.label}
            {mode !== "coral" ? null : <span className="mt-1 block min-w-0 break-words text-xs font-semibold text-ocean-900/56 [overflow-wrap:anywhere]">{formatCurrency(option.amount, currency)}</span>}
          </button>
        ))}
        <button
          type="button"
          className={`rounded-xl border px-4 py-4 text-left text-sm font-bold transition ${
            isCustomAmountSelected
              ? "border-coral-500 bg-coral-100/40 text-ocean-900"
              : "border-ocean-900/10 text-ocean-900 hover:border-coral-500"
          }`}
          onClick={() => {
            if (!isCustomAmountSelected) {
              setCustomAmount("");
            }
            setIsCustomAmountSelected(true);
          }}
        >
          {labels.otherAmount}
          <span className="mt-1 block text-xs font-semibold text-ocean-900/56">{labels.otherHelp}</span>
        </button>
      </div>

      {isCustomAmountSelected ? (
        <label className="mt-4 grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
          {labels.customAmount}
          <input
            inputMode="numeric"
            value={customAmount}
            onChange={(event) => setCustomAmount(event.target.value)}
            placeholder={labels.customPlaceholder}
            className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
          />
        </label>
      ) : null}

      <div className="mt-5 rounded-xl border border-ocean-900/10 bg-ocean-50 p-4">
        <div className="flex items-start gap-3">
          <HeartHandshake className="mt-0.5 shrink-0 text-coral-500" size={22} aria-hidden="true" />
          <p className="text-sm leading-6 text-ocean-900/76">
            {hasValidDonationAmount
              ? impactText(mode, amount, currency, goal, impactTarget, impactUnit, impactUnitCost, impactTargets, carbonKgPerUsd, locale)
              : labels.preview}
          </p>
        </div>
      </div>

      {disabledReason ? (
        <div className="mt-5 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">
          {disabledReason}
        </div>
      ) : (
        <>
          {hasValidDonationAmount ? (
            <Link href={href} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-coral-500 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-coral-700">
              {labels.continue}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mt-5 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-full bg-ocean-900/18 px-5 py-3 text-sm font-bold text-ocean-900/50"
            >
              {labels.minimum} {formatCurrency(minimumAmount, currency)}
            </button>
          )}
        </>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {isAuthenticated ? (
          <form action={isSaved ? removeSavedCampaignAction : saveCampaignAction}>
            <input type="hidden" name="campaignSlug" value={campaignSlug} />
            <input type="hidden" name="next" value={campaignPath} />
            <button
              type="submit"
              aria-label={isSaved ? labels.removeSavedAria : labels.saveAria}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full text-ocean-900/68 transition hover:bg-ocean-50 hover:text-ocean-900"
            >
              <Bookmark size={16} aria-hidden="true" fill={isSaved ? "currentColor" : "none"} />
              {isSaved ? labels.saved : labels.save}
            </button>
          </form>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(campaignPath)}`}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-ocean-900/68 transition hover:bg-ocean-50 hover:text-ocean-900"
          >
            <Bookmark size={16} aria-hidden="true" />
            {labels.signInSave}
          </Link>
        )}
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full text-ocean-900/68 transition hover:bg-ocean-50 hover:text-ocean-900"
          onClick={() => void shareCampaign()}
        >
          {shareStatus === "copied" || shareStatus === "shared" ? <CheckCircle2 size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
          <span aria-live="polite">{shareLabel}</span>
        </button>
      </div>

      <div className="mt-5 grid gap-3 border-t border-ocean-900/10 pt-5 text-sm text-ocean-900/68">
        {[
          [LockKeyhole, labels.paymentOutside],
          [ShieldCheck, labels.verifiedPartner],
          [CheckCircle2, labels.transparentBudget],
          [CheckCircle2, labels.proofVerification]
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
            <p className="text-xs font-semibold text-ocean-900/58">{progress}% {labels.funded}</p>
          </div>
          <Button type="button" tone="donation" disabled={Boolean(disabledReason)} onClick={() => setIsSheetOpen(true)}>
            {labels.donateNow}
          </Button>
        </div>
      </div>

      {isSheetOpen ? (
        <div className="fixed inset-0 z-50 bg-ocean-900/54 p-4 lg:hidden">
          <button className="absolute inset-0 h-full w-full cursor-default" aria-label={labels.closeSelector} type="button" onClick={() => setIsSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-sand-50 p-4">
            <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-ocean-900/18" />
            {card}
          </div>
        </div>
      ) : null}
    </>
  );
}
