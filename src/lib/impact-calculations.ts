import { toNumber } from "@/lib/domain";

export const CARBON_SETTING_KEY = "impact.carbon";

export type ImpactCurrency = "USD" | "IDR" | string;

type CampaignImpactInput = {
  goalAmount: string | number | null | undefined;
  impactTarget: number | null | undefined;
  impactUnitCost?: string | number | null;
  impactUnit: string;
};

export function normalizeCurrency(value: unknown, fallback: ImpactCurrency = "USD") {
  const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const normalized = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  return normalized || fallback;
}

export function currencyMinorStep(currency: string) {
  return normalizeCurrency(currency) === "IDR" ? 50_000 : 5;
}

export function minimumDonationAmount(currency: string) {
  return normalizeCurrency(currency) === "IDR" ? 10_000 : 1;
}

export function isCoralImpactUnit(impactUnit: string | null | undefined) {
  const normalized = String(impactUnit ?? "").toLowerCase();

  return normalized.includes("coral") || normalized.includes("karang");
}

export function campaignImpactUnitCost(input: Pick<CampaignImpactInput, "goalAmount" | "impactTarget" | "impactUnitCost">) {
  const explicit = toNumber(input.impactUnitCost);

  if (explicit > 0) {
    return explicit;
  }

  const goal = toNumber(input.goalAmount);
  const target = Number(input.impactTarget ?? 0);

  return goal > 0 && target > 0 ? goal / target : 0;
}

export function calculateDonationImpact(input: {
  amount: string | number;
  currency: string;
  campaign: CampaignImpactInput;
  carbonKgPerUsd?: number | null;
}) {
  const amount = toNumber(input.amount);
  const currency = normalizeCurrency(input.currency);
  const unitCost = campaignImpactUnitCost(input.campaign);
  const impactUnitCount = unitCost > 0 ? amount / unitCost : 0;
  const coralFragments = isCoralImpactUnit(input.campaign.impactUnit) ? impactUnitCount : 0;
  const carbonKg =
    currency === "USD" && typeof input.carbonKgPerUsd === "number" && Number.isFinite(input.carbonKgPerUsd) && input.carbonKgPerUsd > 0
      ? amount * input.carbonKgPerUsd
      : null;

  return {
    amount,
    currency,
    unitCost,
    impactUnit: input.campaign.impactUnit,
    impactUnitCount,
    coralFragments,
    carbonKg
  };
}

export function formatImpactQuantity(value: number, maximumFractionDigits = 1) {
  return value.toLocaleString("id-ID", {
    maximumFractionDigits,
    minimumFractionDigits: value > 0 && value < 1 ? Math.min(2, maximumFractionDigits) : 0
  });
}

export function buildPassportNumber(userId: string, issuedAt = new Date()) {
  const year = issuedAt.getUTCFullYear();
  const suffixSource = userId.replace(/[^0-9a-z]/gi, "").toUpperCase() || "00000000";
  const suffix = suffixSource.slice(-8).padStart(8, "0");

  return `TRB-PASS-${year}-${suffix}`;
}

export function parseCarbonKgPerUsd(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.]/g, ""));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
