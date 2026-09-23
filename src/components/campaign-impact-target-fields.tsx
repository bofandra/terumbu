import {
  campaignImpactTargetPresets,
  campaignImpactTargetTypes,
  defaultImpactUnitForImpactType,
  labelForCampaignImpactTargetType,
  normalizeCampaignImpactTargetType
} from "@/lib/campaign-content";

type ImpactTargetLine = {
  id?: string;
  impactType?: string | null;
  label?: string | null;
  unit?: string | null;
  target?: string | number | null;
  unitCost?: string | number | null;
  allocationPercent?: string | number | null;
  isPrimary?: boolean | null;
  sortOrder?: number | null;
};

type CampaignImpactTargetFieldsProps = {
  lines?: ImpactTargetLine[] | null;
  inputClassName: string;
  selectClassName?: string;
};

function valueString(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  return Number(text) === 0 ? "" : text;
}

function formRows(lines?: ImpactTargetLine[] | null) {
  const explicitRows = (lines ?? [])
    .filter((line) => Number(line.target ?? 0) > 0)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((line) => {
      const impactType = normalizeCampaignImpactTargetType(line.impactType);

      return {
        id: line.id,
        impactType,
        label: line.label ?? labelForCampaignImpactTargetType(impactType),
        unit: line.unit ?? defaultImpactUnitForImpactType(impactType),
        target: line.target,
        unitCost: line.unitCost,
        allocationPercent: line.allocationPercent,
        isPrimary: Boolean(line.isPrimary)
      };
    });
  const usedTypes = new Set(explicitRows.map((line) => line.impactType));
  const presetRows = campaignImpactTargetPresets
    .filter((preset) => !usedTypes.has(preset.impactType))
    .map((preset) => ({
      ...preset,
      target: "",
      unitCost: "",
      allocationPercent: "",
      isPrimary: false
    }));

  return explicitRows.length > 0 ? [...explicitRows, ...presetRows] : presetRows;
}

export function CampaignImpactTargetFields({
  lines,
  inputClassName,
  selectClassName = inputClassName
}: CampaignImpactTargetFieldsProps) {
  const rows = formRows(lines);
  const primaryIndex = Math.max(0, rows.findIndex((line) => line.isPrimary));

  return (
    <div className="rounded-lg border border-ocean-900/10 bg-white p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-coral-700">Impact mix</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">
            Fill one or more targets. Allocation controls how each donation is split; cost per unit can be explicit or derived from allocation and target.
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/45">Optional rows can stay blank</span>
      </div>

      <div className="mt-4 grid gap-3">
        {rows.map((line, index) => (
          <div key={`${"id" in line ? line.id ?? line.impactType : line.impactType}-${index}`} className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-3 lg:grid-cols-[1.2fr_1fr_0.8fr_1fr_0.8fr_0.8fr_auto] lg:items-end">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
              Label
              <input name="impactLineLabel" defaultValue={line.label} className={inputClassName} placeholder="Coral restoration" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
              Type
              <select name="impactLineType" defaultValue={line.impactType} className={selectClassName}>
                {campaignImpactTargetTypes.map((type) => (
                  <option key={type} value={type}>
                    {labelForCampaignImpactTargetType(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
              Target
              <input name="impactLineTarget" type="number" min="0" step="0.01" defaultValue={valueString(line.target)} className={inputClassName} placeholder="10000" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
              Unit
              <input name="impactLineUnit" defaultValue={line.unit} className={inputClassName} placeholder="coral fragments" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
              Cost/unit
              <input name="impactLineUnitCost" type="number" min="0" step="0.01" defaultValue={valueString(line.unitCost)} className={inputClassName} placeholder="Auto" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ocean-900/58">
              Allocation %
              <input name="impactLineAllocationPercent" type="number" min="0" max="100" step="0.01" defaultValue={valueString(line.allocationPercent)} className={inputClassName} placeholder="100" />
            </label>
            <label className="flex items-center gap-2 pb-3 text-sm font-bold text-ocean-900 lg:pb-2">
              <input name="impactLinePrimaryIndex" type="radio" value={index} defaultChecked={index === primaryIndex} className="size-4 accent-coral-500" />
              Primary
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
