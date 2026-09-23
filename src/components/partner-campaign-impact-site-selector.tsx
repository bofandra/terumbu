"use client";

import { useState } from "react";

import { campaignCategoryFromEcosystemType, impactSiteEcosystemTypes } from "@/lib/campaign-content";

type ImpactSiteOption = {
  id: string;
  name: string;
  type: string;
  region: string;
};

type PartnerCampaignImpactSiteSelectorProps = {
  impactSites: ImpactSiteOption[];
  inputClassName: string;
};

type ImpactSiteMode = "existing" | "new";

export function PartnerCampaignImpactSiteSelector({ impactSites, inputClassName }: PartnerCampaignImpactSiteSelectorProps) {
  const [mode, setMode] = useState<ImpactSiteMode>(hasExistingSites ? "existing" : "new");
  const [existingSiteId, setExistingSiteId] = useState(impactSites[0]?.id ?? "");
  const [newType, setNewType] = useState("Coral");
  const [newRegion, setNewRegion] = useState("");
  const hasExistingSites = impactSites.length > 0;
  const existingSite = impactSites.find((site) => site.id === existingSiteId) ?? impactSites[0] ?? null;
  const derivedCategory =
    mode === "existing" && existingSite
      ? campaignCategoryFromEcosystemType(existingSite.type)
      : campaignCategoryFromEcosystemType(newType);
  const derivedRegion =
    mode === "existing" && existingSite
      ? existingSite.region
      : newRegion || "Indonesia";

  return (
    <div className="rounded-lg border border-ocean-900/10 bg-white p-4">
      <div className="mb-3">
        <p className="text-sm font-bold text-ocean-900">Impact site <span className="text-coral-700">*</span></p>
        <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">
          Every campaign must have one field location. Choose an existing location or create a new one.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
          Impact site
          <select name="impactLinkMode" value={mode} className={inputClassName} onChange={(event) => setMode(event.target.value as ImpactSiteMode)} required>
            {hasExistingSites ? <option value="existing">Choose an existing field location</option> : null}
            <option value="new">Create a new field location</option>
          </select>
        </label>
        {mode === "existing" ? (
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Existing location
            <select name="existingImpactSiteId" value={existingSiteId} className={inputClassName} required={mode === "existing"} onChange={(event) => setExistingSiteId(event.target.value)}>
              {impactSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} / {site.type} / {site.region}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-ocean-900/10 bg-ocean-50 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Public category</p>
          <p className="mt-1 text-sm font-bold text-ocean-900">{derivedCategory}</p>
        </div>
        <div className="rounded-lg border border-ocean-900/10 bg-ocean-50 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Public region</p>
          <p className="mt-1 text-sm font-bold text-ocean-900">{derivedRegion}</p>
        </div>
      </div>

      {mode === "new" ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              New site ecosystem
              <select name="impactSiteEcosystemType" value={newType} className={inputClassName} required={mode === "new"} onChange={(event) => setNewType(event.target.value)}>
                {impactSiteEcosystemTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              New site name
              <input name="impactSiteName" placeholder="Raja Ampat Reef Garden" className={inputClassName} required={mode === "new"} />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              New site region
              <input name="impactSiteRegion" value={newRegion} placeholder="Southwest Papua" className={inputClassName} required={mode === "new"} onChange={(event) => setNewRegion(event.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              Latitude
              <input name="impactSiteLatitude" type="number" min="-90" max="90" step="0.000001" placeholder="-0.234900" className={inputClassName} required={mode === "new"} />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              Longitude
              <input name="impactSiteLongitude" type="number" min="-180" max="180" step="0.000001" placeholder="130.516600" className={inputClassName} required={mode === "new"} />
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
