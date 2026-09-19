import type { ReactNode } from "react";

import { adminInputClassName, adminSelectClassName } from "@/components/admin-ui";
import { impactSiteEcosystemTypes, impactSiteVerificationStatuses } from "@/lib/campaign-content";
import { cn } from "@/lib/utils";

export type AdminImpactSiteCampaignOption = {
  id: string;
  title: string;
  slug: string;
  status: string;
  organizationName: string;
};

export type AdminImpactSiteFormValues = {
  campaignId?: string | null;
  name?: string | null;
  ecosystemType?: string | null;
  region?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  verification?: string | null;
  progress?: string | number | null;
  evidenceCount?: string | number | null;
  latestSurvey?: string | null;
};

export type AdminImpactSiteFieldErrors = Partial<Record<
  "name" | "region" | "latitude" | "longitude" | "progress" | "evidenceCount",
  string
>>;

function Field({
  id,
  label,
  children,
  className,
  required,
  error
}: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
  error?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <label htmlFor={id} className={cn("grid gap-1.5 text-sm font-bold text-ocean-900", className)}>
      <span className="flex items-center gap-1">
        {label}
        {required ? (
          <>
            <span className="text-coral-700" aria-hidden="true">*</span>
            <span className="sr-only">required</span>
          </>
        ) : null}
      </span>
      {children}
      {error ? <span id={errorId} className="text-xs font-bold leading-5 text-coral-700">{error}</span> : null}
    </label>
  );
}

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function optionValuesWithCurrent(options: string[], current?: string | null) {
  return current && !options.includes(current) ? [...options, current] : options;
}

function fieldA11y(error: string | undefined, id: string) {
  return error ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};
}

export function validateAdminImpactSiteFormValues(values: AdminImpactSiteFormValues): AdminImpactSiteFieldErrors {
  const errors: AdminImpactSiteFieldErrors = {};
  const name = String(values.name ?? "").trim();
  const region = String(values.region ?? "").trim();
  const latitude = Number(String(values.latitude ?? "").replace(/,/g, "."));
  const longitude = Number(String(values.longitude ?? "").replace(/,/g, "."));
  const progressRaw = String(values.progress ?? "0").trim();
  const evidenceRaw = String(values.evidenceCount ?? "0").trim();
  const progress = Number(progressRaw || "0");
  const evidenceCount = Number(evidenceRaw || "0");

  if (!name) errors.name = "Enter a site name.";
  if (!region) errors.region = "Enter a region.";
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) errors.latitude = "Enter a latitude from -90 to 90.";
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.longitude = "Enter a longitude from -180 to 180.";
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) errors.progress = "Enter progress from 0 to 100.";
  if (!Number.isInteger(evidenceCount) || evidenceCount < 0) errors.evidenceCount = "Enter a whole-number evidence count of 0 or more.";

  return errors;
}

export function AdminImpactSiteErrorSummary({ errors }: { errors: AdminImpactSiteFieldErrors }) {
  const entries = Object.entries(errors) as Array<[keyof AdminImpactSiteFieldErrors, string]>;

  if (entries.length === 0) return null;

  const labels: Record<keyof AdminImpactSiteFieldErrors, string> = {
    name: "Site name",
    region: "Region",
    latitude: "Latitude",
    longitude: "Longitude",
    progress: "Progress",
    evidenceCount: "Evidence records"
  };

  return (
    <div role="alert" className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm text-coral-700">
      <p className="font-bold">Check the highlighted fields.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 font-semibold">
        {entries.map(([field, message]) => (
          <li key={field}>
            <a href={`#impact-site-${field}`} className="underline decoration-2 underline-offset-2 hover:no-underline">
              {labels[field]}: {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminImpactSiteFields({
  campaigns,
  values,
  errors = {},
  advancedOpen = false
}: {
  campaigns: AdminImpactSiteCampaignOption[];
  values?: AdminImpactSiteFormValues;
  errors?: AdminImpactSiteFieldErrors;
  advancedOpen?: boolean;
}) {
  const ecosystemType = String(values?.ecosystemType ?? "Coral");
  const verification = String(values?.verification ?? "basic");

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-3">
        <Field id="impact-site-campaignId" label="Linked campaign" className="lg:col-span-2">
          <select id="impact-site-campaignId" name="campaignId" defaultValue={values?.campaignId ?? ""} className={adminSelectClassName}>
            <option value="">Unassigned staging site</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title} / {campaign.organizationName} / {labelize(campaign.status)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="impact-site-verification" label="Verification">
          <select id="impact-site-verification" name="verification" defaultValue={verification} className={adminSelectClassName}>
            {impactSiteVerificationStatuses.map((status) => (
              <option key={status} value={status}>{labelize(status)}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Field id="impact-site-name" label="Site name" required error={errors.name}>
          <input
            id="impact-site-name"
            name="name"
            defaultValue={values?.name ?? ""}
            placeholder="Raja Ampat Reef Garden"
            className={adminInputClassName}
            required
            {...fieldA11y(errors.name, "impact-site-name")}
          />
        </Field>
        <Field id="impact-site-ecosystemType" label="Ecosystem type" required>
          <select id="impact-site-ecosystemType" name="ecosystemType" defaultValue={ecosystemType} className={adminSelectClassName} required>
            {optionValuesWithCurrent([...impactSiteEcosystemTypes], ecosystemType).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field id="impact-site-region" label="Region" required error={errors.region}>
          <input
            id="impact-site-region"
            name="region"
            defaultValue={values?.region ?? ""}
            placeholder="Southwest Papua"
            className={adminInputClassName}
            required
            {...fieldA11y(errors.region, "impact-site-region")}
          />
        </Field>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Field id="impact-site-latitude" label="Latitude" required error={errors.latitude}>
          <input
            id="impact-site-latitude"
            name="latitude"
            type="number"
            min="-90"
            max="90"
            step="0.000001"
            defaultValue={values?.latitude ?? ""}
            placeholder="-0.234900"
            className={adminInputClassName}
            required
            {...fieldA11y(errors.latitude, "impact-site-latitude")}
          />
        </Field>
        <Field id="impact-site-longitude" label="Longitude" required error={errors.longitude}>
          <input
            id="impact-site-longitude"
            name="longitude"
            type="number"
            min="-180"
            max="180"
            step="0.000001"
            defaultValue={values?.longitude ?? ""}
            placeholder="130.516600"
            className={adminInputClassName}
            required
            {...fieldA11y(errors.longitude, "impact-site-longitude")}
          />
        </Field>
      </div>

      <details className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3" open={advancedOpen}>
        <summary className="cursor-pointer text-sm font-bold text-ocean-900">Advanced tracking fields</summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Field id="impact-site-progress" label="Progress" error={errors.progress}>
            <input
              id="impact-site-progress"
              name="progress"
              type="number"
              min="0"
              max="100"
              step="1"
              defaultValue={values?.progress ?? 0}
              className={adminInputClassName}
              {...fieldA11y(errors.progress, "impact-site-progress")}
            />
          </Field>
          <Field id="impact-site-evidenceCount" label="Evidence records" error={errors.evidenceCount}>
            <input
              id="impact-site-evidenceCount"
              name="evidenceCount"
              type="number"
              min="0"
              step="1"
              defaultValue={values?.evidenceCount ?? 0}
              className={adminInputClassName}
              {...fieldA11y(errors.evidenceCount, "impact-site-evidenceCount")}
            />
          </Field>
          <Field id="impact-site-latestSurvey" label="Latest survey">
            <input id="impact-site-latestSurvey" name="latestSurvey" type="date" defaultValue={values?.latestSurvey ?? ""} className={adminInputClassName} />
          </Field>
        </div>
      </details>
    </>
  );
}
