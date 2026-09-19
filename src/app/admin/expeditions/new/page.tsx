import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader, adminInputClassName, adminPanelClassName, adminSelectClassName, adminTextareaClassName } from "@/components/admin-ui";
import { ExpeditionMarketplaceFields } from "@/components/expedition-marketplace-fields";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import type { ExpeditionMarketplaceMetadata } from "@/lib/expedition-marketplace";
import { createExpeditionAction } from "@/lib/portal-actions";
import { getAdminOperationsData } from "@/lib/queries";
import { MAX_DATABASE_IMAGE_BYTES } from "@/lib/storage";

export const metadata = {
  title: "New Admin Expedition"
};

export const dynamic = "force-dynamic";

const imageUploadHelp = `PNG, JPG, WebP, or GIF up to ${(MAX_DATABASE_IMAGE_BYTES / 1_000_000).toFixed(1)} MB.`;
const marketplaceDefaults: ExpeditionMarketplaceMetadata = {
  typeLabel: "Eco Program",
  programTypes: ["Eco Program"],
  highlights: ["Higher chance of approval"],
  purposes: ["Connect with nature", "Learn about sustainability"],
  helpActivities: ["Coral Restoration", "Reef Monitoring", "Community Work"],
  styles: ["Contact with nature", "Rural"],
  collaborationHoursPerWeek: 20,
  travelLengthLabel: "Short Term Stay",
  accommodations: ["Shared Dorm"],
  mealsIncluded: "2 meals",
  digitalNomadAmenities: ["Basic Internet Access"],
  benefits: ["Use our equipped kitchen", "Free Events"],
  badges: ["Sustainable project", "Higher approval"],
  additionalFee: null
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing related campaign or leave the field empty.",
  "expedition-invalid": "Enter a title, slug, region, duration, price, and summary.",
  "expedition-slug": "That expedition slug is already in use.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file."
};

type AdminExpeditionNewPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function Field({
  label,
  children,
  className = "",
  help,
  required = false
}: {
  label: string;
  children: ReactNode;
  className?: string;
  help?: string;
  required?: boolean;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-ocean-900 ${className}`}>
      <span className="flex items-center gap-1">
        {label}
        {required ? (
          <>
            <span className="text-coral-700" aria-hidden="true">
              *
            </span>
            <span className="sr-only">required</span>
          </>
        ) : null}
      </span>
      {children}
      {help ? <span className="text-xs font-semibold leading-5 text-ocean-900/54">{help}</span> : null}
    </label>
  );
}

function RelatedCampaignSelect({
  campaigns
}: {
  campaigns: Awaited<ReturnType<typeof getAdminOperationsData>>["campaignOptions"];
}) {
  return (
    <select name="relatedCampaignId" defaultValue="" className={adminSelectClassName}>
      <option value="">No related campaign</option>
      {campaigns.map((campaign) => (
        <option key={campaign.id} value={campaign.id}>
          {campaign.title} / {campaign.organizationName} / {campaign.status}
        </option>
      ))}
    </select>
  );
}

export default async function AdminExpeditionNewPage({ searchParams }: AdminExpeditionNewPageProps) {
  await requireRole(["admin"], "/admin/expeditions/new");
  const params = await searchParams;
  const data = await getAdminOperationsData();
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Expeditions"
        title="Create expedition"
        description="Add a public trip catalog record before scheduling departures."
        actionHref="/admin/expeditions"
        actionLabel="Expedition list"
      />

      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Catalog details</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Public trip information, campaign linkage, and price.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form action={createExpeditionAction} encType="multipart/form-data" className="grid gap-4 p-4">
          <input type="hidden" name="errorReturnTo" value="/admin/expeditions/new" />
          <input type="hidden" name="savedReturnTo" value="/admin/expeditions" />
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Title" className="lg:col-span-2" required>
              <input name="title" placeholder="Raja Ampat Coral Restoration Expedition" className={adminInputClassName} required />
            </Field>
            <Field label="Slug">
              <input name="slug" placeholder="raja-ampat-coral-restoration" className={adminInputClassName} />
            </Field>
            <Field label="Region" required>
              <input name="region" placeholder="Raja Ampat" className={adminInputClassName} required />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Duration days" required>
              <input name="durationDays" type="number" min={1} defaultValue={4} className={adminInputClassName} required />
            </Field>
            <Field label="Base price" required>
              <input name="basePrice" type="number" min={1} step={0.01} placeholder="250.00" className={adminInputClassName} required />
            </Field>
            <Field label="Currency" required>
              <select name="currency" defaultValue="USD" className={adminSelectClassName} required>
                <option value="USD">USD</option>
              </select>
            </Field>
            <Field label="Related campaign">
              <RelatedCampaignSelect campaigns={data.campaignOptions} />
            </Field>
          </div>
          <Field label="Upload image" help={imageUploadHelp}>
            <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} />
          </Field>
          <Field label="Documentation link">
            <input name="documentationUrl" type="url" placeholder="https://drive.google.com/..." className={adminInputClassName} />
          </Field>
          <Field label="Summary" required>
            <textarea name="summary" placeholder="Trip summary shown on public expedition cards and detail pages." className={adminTextareaClassName} required />
          </Field>
          <ExpeditionMarketplaceFields
            marketplace={marketplaceDefaults}
            inputClassName={adminInputClassName}
            textareaClassName={adminTextareaClassName}
          />
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Plus className="size-4" aria-hidden="true" />
            Create Expedition
          </Button>
        </form>
      </section>
    </div>
  );
}
