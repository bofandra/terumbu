"use client";

import { useMemo, useState } from "react";

import {
  campaignImpactTargetPresets,
  campaignImpactTargetTypes,
  defaultImpactUnitForImpactType,
  labelForCampaignImpactTargetType,
  normalizeCampaignImpactTargetType
} from "@/lib/campaign-content";
import { formatCurrency } from "@/lib/utils";

type ImpactPlanRow = {
  impactType: string;
  label: string;
  target: string;
  unit: string;
  unitCost: string;
};

type InitialImpactPlanLine = {
  impactType?: string | null;
  label?: string | null;
  target?: string | number | null;
  unit?: string | null;
  unitCost?: string | number | null;
  isPrimary?: boolean | null;
  sortOrder?: number | null;
};

type PartnerCampaignImpactPlanningFieldsProps = {
  inputClassName: string;
  selectClassName?: string;
  currency?: string;
  initialLines?: InitialImpactPlanLine[] | null;
};

function valueString(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  return Number(text) === 0 ? "" : text;
}

function buildInitialRows(initialLines?: InitialImpactPlanLine[] | null): { rows: ImpactPlanRow[]; primaryIndex: number } {
  const explicitRows = (initialLines ?? [])
    .filter((line) => Number(line.target ?? 0) > 0)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((line) => {
      const impactType = normalizeCampaignImpactTargetType(line.impactType);

      return {
        impactType,
        label: line.label ?? labelForCampaignImpactTargetType(impactType),
        target: valueString(line.target),
        unit: line.unit ?? defaultImpactUnitForImpactType(impactType),
        unitCost: valueString(line.unitCost),
        isPrimary: Boolean(line.isPrimary)
      };
    });

  const usedTypes = new Set(explicitRows.map((row) => row.impactType));
  const presetRows = campaignImpactTargetPresets
    .filter((preset) => !usedTypes.has(preset.impactType))
    .map((preset) => ({
      impactType: preset.impactType,
      label: preset.label,
      target: "",
      unit: preset.unit,
      unitCost: "",
      isPrimary: false
    }));

  const seededRows = explicitRows.length > 0 ? [...explicitRows, ...presetRows] : presetRows;

  return {
    rows: seededRows.map(({ impactType, label, target, unit, unitCost }) => ({ impactType, label, target, unit, unitCost })),
    primaryIndex: Math.max(0, seededRows.findIndex((row) => row.isPrimary))
  };
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function PartnerCampaignImpactPlanningFields({
  inputClassName,
  selectClassName = inputClassName,
  currency = "USD",
  initialLines
}: PartnerCampaignImpactPlanningFieldsProps) {
  const [{ rows, primaryIndex }, setPlan] = useState(() => buildInitialRows(initialLines));
  const lineBudgets = useMemo(
    () => rows.map((row) => parseNumber(row.target) * parseNumber(row.unitCost)),
    [rows]
  );
  const goalAmount = lineBudgets.reduce((total, value) => total + value, 0);

  function updateRow(index: number, patch: Partial<ImpactPlanRow>) {
    setPlan((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        const next = { ...row, ...patch };

        if (patch.impactType) {
          const impactType = normalizeCampaignImpactTargetType(patch.impactType);
          next.impactType = impactType;
          next.label = labelForCampaignImpactTargetType(impactType);
          next.unit = defaultImpactUnitForImpactType(impactType);
        }

        return next;
      })
    }));
  }

  function setPrimaryIndex(index: number) {
    setPlan((current) => ({ ...current, primaryIndex: index }));
  }

  return (
    <div className="rounded-lg border border-ocean-900/10 bg-white p-4">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-coral-700">Impact plan</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">
            Fill target and cost per unit. Goal amount is calculated automatically from the active rows.
          </p>
        </div>
        <label className="grid min-w-56 gap-1.5 text-sm font-bold text-ocean-900">
          Goal amount
          <input
            name="goalAmount"
            type="number"
            min="1"
            step="0.01"
            value={goalAmount > 0 ? goalAmount.toFixed(2) : ""}
            readOnly
            className={inputClassName}
            placeholder="Auto-calculated"
            required
          />
          <span className="text-xs font-semibold leading-5 text-ocean-900/54">
            {goalAmount > 0 ? formatCurrency(goalAmount, currency) : "Add target and cost/unit below."}
          </span>
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        {rows.map((row, index) => {
          const lineBudget = lineBudgets[index];
          const allocation = goalAmount > 0 && lineBudget > 0 ? (lineBudget / goalAmount) * 100 : 0;

          return (
            <div key={`${row.impactType}-${index}`} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-3 lg:grid-cols-[1.2fr_1fr_0.8fr_1fr_0.8fr_0.9fr_auto] lg:items-end">
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
                Label
                <input name="impactLineLabel" value={row.label} className={inputClassName} onChange={(event) => updateRow(index, { label: event.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
                Type
                <select name="impactLineType" value={row.impactType} className={selectClassName} onChange={(event) => updateRow(index, { impactType: event.target.value })}>
                  {campaignImpactTargetTypes.map((type) => (
                    <option key={type} value={type}>
                      {labelForCampaignImpactTargetType(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
                Target
                <input name="impactLineTarget" type="number" min="0" step="0.01" value={row.target} className={inputClassName} placeholder="10000" onChange={(event) => updateRow(index, { target: event.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
                Unit
                <input name="impactLineUnit" value={row.unit} className={inputClassName} onChange={(event) => updateRow(index, { unit: event.target.value })} />
              </label>
              <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
                Cost/unit
                <input name="impactLineUnitCost" type="number" min="0" step="0.01" value={row.unitCost} className={inputClassName} placeholder="3.50" onChange={(event) => updateRow(index, { unitCost: event.target.value })} />
              </label>
              <div className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
                Budget share
                <span className="flex min-h-11 items-center rounded-lg border border-ocean-900/10 bg-white px-3 text-sm normal-case tracking-normal text-ocean-900">
                  {allocation > 0 ? `${allocation.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%` : "-"}
                </span>
                <input name="impactLineAllocationPercent" type="hidden" value={allocation > 0 ? allocation.toFixed(2) : ""} />
              </div>
              <label className="flex items-center gap-2 pb-3 text-sm font-bold text-ocean-900 lg:pb-2">
                <input
                  name="impactLinePrimaryIndex"
                  type="radio"
                  value={index}
                  checked={index === primaryIndex}
                  onChange={() => setPrimaryIndex(index)}
                  className="size-4 accent-coral-500"
                />
                Primary
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
