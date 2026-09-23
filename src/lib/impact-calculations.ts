import { toNumber } from "@/lib/domain";

export const CARBON_SETTING_KEY = "impact.carbon";

export type ImpactCurrency = "USD" | "IDR" | string;

type CampaignImpactInput = {
  goalAmount: string | number | null | undefined;
  impactTarget: number | null | undefined;
  impactUnitCost?: string | number | null;
  impactUnit: string;
  impactTargets?: CampaignImpactLineInput[] | null;
};

export type CampaignImpactLineInput = {
  impactType?: string | null;
  label?: string | null;
  unit?: string | null;
  target?: string | number | null;
  unitCost?: string | number | null;
  allocationPercent?: string | number | null;
  isPrimary?: boolean | null;
  sortOrder?: number | null;
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

export function isCarbonImpactUnit(impactUnit: string | null | undefined) {
  const normalized = String(impactUnit ?? "").toLowerCase();

  return normalized.includes("carbon") || normalized.includes("co2");
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

function normalizedImpactType(value: string | null | undefined, unit: string) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized) {
    return normalized;
  }

  if (isCoralImpactUnit(unit)) {
    return "coral";
  }

  if (isCarbonImpactUnit(unit)) {
    return "carbon";
  }

  if (unit.toLowerCase().includes("mangrove")) {
    return "mangrove";
  }

  return "other";
}

export function campaignImpactLines(input: CampaignImpactInput) {
  const explicitLines = (input.impactTargets ?? [])
    .map((line, index) => {
      const unit = String(line.unit ?? "").trim();
      const target = toNumber(line.target);

      return {
        impactType: normalizedImpactType(line.impactType, unit),
        label: String(line.label ?? "").trim() || unit || "Impact target",
        unit,
        target,
        unitCost: toNumber(line.unitCost) > 0 ? toNumber(line.unitCost) : null,
        allocationPercent: toNumber(line.allocationPercent) > 0 ? Math.min(100, toNumber(line.allocationPercent)) : null,
        isPrimary: Boolean(line.isPrimary),
        sortOrder: Number(line.sortOrder ?? index)
      };
    })
    .filter((line) => line.unit && line.target > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (explicitLines.length > 0) {
    return explicitLines;
  }

  const target = Number(input.impactTarget ?? 0);

  if (target <= 0 || !input.impactUnit) {
    return [];
  }

  return [
    {
      impactType: normalizedImpactType(null, input.impactUnit),
      label: input.impactUnit,
      unit: input.impactUnit,
      target,
      unitCost: campaignImpactUnitCost(input),
      allocationPercent: 100,
      isPrimary: true,
      sortOrder: 0
    }
  ];
}

function impactLineUnitCost(goalAmount: string | number | null | undefined, line: ReturnType<typeof campaignImpactLines>[number], lineCount: number) {
  if (line.unitCost && line.unitCost > 0) {
    return line.unitCost;
  }

  const goal = toNumber(goalAmount);

  if (goal <= 0 || line.target <= 0) {
    return 0;
  }

  if (line.allocationPercent && line.allocationPercent > 0) {
    return (goal * (line.allocationPercent / 100)) / line.target;
  }

  return lineCount <= 1 ? goal / line.target : 0;
}

export function calculateDonationImpact(input: {
  amount: string | number;
  currency: string;
  campaign: CampaignImpactInput;
  carbonKgPerUsd?: number | null;
}) {
  const amount = toNumber(input.amount);
  const currency = normalizeCurrency(input.currency);
  const lines = campaignImpactLines(input.campaign);
  const hasAnyAllocation = lines.some((line) => line.allocationPercent && line.allocationPercent > 0);
  const lineCosts = lines.map((line) => impactLineUnitCost(input.campaign.goalAmount, line, lines.length));
  const lineBudgets = lines.map((line, index) => (lineCosts[index] > 0 ? lineCosts[index] * line.target : 0));
  const totalLineBudget = lineBudgets.reduce((total, value) => total + value, 0);
  const impactBreakdown = lines.map((line, index) => {
    const unitCost = lineCosts[index];
    const allocatedAmount = hasAnyAllocation
      ? amount * ((line.allocationPercent ?? 0) / 100)
      : lines.length <= 1
        ? amount
        : totalLineBudget > 0
          ? amount * (lineBudgets[index] / totalLineBudget)
          : 0;

    return {
      impactType: line.impactType,
      label: line.label,
      unit: line.unit,
      target: line.target,
      unitCost,
      allocationPercent: line.allocationPercent,
      allocatedAmount,
      unitCount: unitCost > 0 ? allocatedAmount / unitCost : 0,
      isPrimary: line.isPrimary
    };
  });
  const primaryImpact = impactBreakdown.find((line) => line.isPrimary) ?? impactBreakdown[0];
  const unitCost = primaryImpact?.unitCost ?? campaignImpactUnitCost(input.campaign);
  const impactUnitCount = primaryImpact?.unitCount ?? (unitCost > 0 ? amount / unitCost : 0);
  const impactUnit = primaryImpact?.unit ?? input.campaign.impactUnit;
  const coralFragments = impactBreakdown.reduce(
    (total, line) => total + (line.impactType === "coral" || isCoralImpactUnit(line.unit) ? line.unitCount : 0),
    0
  );
  const carbonLineKg = impactBreakdown.reduce(
    (total, line) => total + (line.impactType === "carbon" || isCarbonImpactUnit(line.unit) ? line.unitCount : 0),
    0
  );
  const globalCarbonKg =
    currency === "USD" && typeof input.carbonKgPerUsd === "number" && Number.isFinite(input.carbonKgPerUsd) && input.carbonKgPerUsd > 0
      ? amount * input.carbonKgPerUsd
      : null;
  const carbonKg = carbonLineKg > 0 ? carbonLineKg : globalCarbonKg;

  return {
    amount,
    currency,
    unitCost,
    impactUnit,
    impactUnitCount,
    coralFragments,
    carbonKg,
    impactBreakdown
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
