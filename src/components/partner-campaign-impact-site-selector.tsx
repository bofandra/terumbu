"use client";

import { useState } from "react";

import { impactSiteEcosystemTypes } from "@/lib/campaign-content";

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

type ImpactSiteMode = "none" | "existing" | "new";

export function PartnerCampaignImpactSiteSelector({ impactSites, inputClassName }: PartnerCampaignImpactSiteSelectorProps) {
  const [mode, setMode] = useState<ImpactSiteMode>("none");
  const hasExistingSites = impactSites.length > 0;

  return (
    <div className="rounded-lg border border-ocean-900/10 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
          Field impact location
          <select name="impactLinkMode" value={mode} className={inputClassName} onChange={(event) => setMode(event.target.value as ImpactSiteMode)}>
            <option value="none">Location not confirmed yet</option>
            <option value="existing" disabled={!hasExistingSites}>Use existing field location</option>
            <option value="new">Create new field location</option>
          </select>
        </label>
        {mode === "existing" ? (
          <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
            Existing location
            <select name="existingImpactSiteId" defaultValue={impactSites[0]?.id ?? ""} className={inputClassName} required={mode === "existing"}>
              {impactSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} / {site.type} / {site.region}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {mode === "none" ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-ocean-900/58">
          You can add or link a field location later from the impact sites page.
        </p>
      ) : null}

      {mode === "new" ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
              New site ecosystem
              <select name="impactSiteEcosystemType" defaultValue="Coral" className={inputClassName} required={mode === "new"}>
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
              <input name="impactSiteRegion" placeholder="Southwest Papua" className={inputClassName} required={mode === "new"} />
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
