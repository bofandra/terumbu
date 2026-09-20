import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminFormDraftPersistence } from "@/components/admin/admin-form-draft-persistence";
import { AdminFormErrorSummary, type AdminFormErrorItem } from "@/components/admin/admin-form-error-summary";
import { AdminPageHeader, adminInputClassName, adminPanelClassName, adminSelectClassName, adminTextareaClassName } from "@/components/admin-ui";
import { ExpeditionMarketplaceFields } from "@/components/expedition-marketplace-fields";
import { Button } from "@/components/ui/button";
import { adminFormFieldNames } from "@/lib/admin-form-state";
import { requireRole } from "@/lib/auth";
import type { ExpeditionMarketplaceMetadata } from "@/lib/expedition-marketplace";
import { createExpeditionAction } from "@/lib/portal-actions";
import { getAdminExpeditionCreateOptions } from "@/lib/queries";
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
  "expedition-invalid": "Some required expedition fields need attention. Your input has been preserved.",
  "expedition-slug": "That expedition slug is already in use. Your input has been preserved.",
  "expedition-metadata-json": "The expedition metadata JSON is invalid. Your other input has been preserved.",
  "image-size": "Uploaded image is too large. Choose a smaller file and submit again.",
  "image-type": "Upload a supported image file and submit again."
};

type SearchValue = string | string[] | undefined;
type AdminExpeditionNewPageProps = {
  searchParams?: Promise<{
    error?: SearchValue;
    field?: SearchValue;
  }>;
};

const expeditionFieldDefinitions: Record<string, AdminFormErrorItem> = {
  title: { fieldId: "expedition-title", label: "Title", message: "Enter an expedition title." },
  slug: { fieldId: "expedition-slug", label: "Slug", message: "Enter a unique expedition slug." },
  region: { fieldId: "expedition-region", label: "Region", message: "Enter a region." },
  durationDays: { fieldId: "expedition-durationDays", label: "Duration days", message: "Enter a duration greater than zero." },
  basePrice: { fieldId: "expedition-basePrice", label: "Base price", message: "Enter a price greater than zero." },
  summary: { fieldId: "expedition-summary", label: "Summary", message: "Enter a public expedition summary." },
  relatedCampaignId: { fieldId: "expedition-relatedCampaignId", label: "Related campaign", message: "Choose an existing campaign or leave it empty." },
  imageFile: { fieldId: "expedition-imageFile", label: "Upload image", message: "Choose a supported image file again." },
  metadataJson: { fieldId: "expedition-metadataJson", label: "Metadata JSON", message: "Enter valid JSON metadata." }
};

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

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
  campaigns,
  invalid
}: {
  campaigns: Awaited<ReturnType<typeof getAdminExpeditionCreateOptions>>["campaignOptions"];
  invalid: boolean;
}) {
  return (
    <select id="expedition-relatedCampaignId" name="relatedCampaignId" defaultValue="" className={adminSelectClassName} aria-invalid={invalid || undefined}>
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
  const data = await getAdminExpeditionCreateOptions();
  const errorCode = first(params?.error);
  const errorMessage = errorCode ? errorMessages[errorCode] : null;
  const invalidFieldNames = adminFormFieldNames(params?.field);
  const invalidFields = new Set(invalidFieldNames);
  const fieldErrors = invalidFieldNames.flatMap((field) => expeditionFieldDefinitions[field] ? [expeditionFieldDefinitions[field]] : []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Expeditions"
        title="Create expedition"
        description="Add a public trip catalog record before scheduling departures."
        actionHref="/admin/expeditions"
        actionLabel="Expedition list"
      />

      {errorMessage ? <AdminAlert tone="error" title="Expedition was not created">{errorMessage}</AdminAlert> : null}
      <AdminFormErrorSummary errors={fieldErrors} />

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Catalog details</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Public trip information, campaign linkage, and price.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form id="admin-expedition-create-form" action={createExpeditionAction} encType="multipart/form-data" className="grid gap-4 p-4">
          <AdminFormDraftPersistence
            formId="admin-expedition-create-form"
            storageKey="terumbu:admin:create-expedition"
            restore={Boolean(errorCode)}
            focusFieldId={fieldErrors[0]?.fieldId}
          />
          <input type="hidden" name="errorReturnTo" value="/admin/expeditions/new" />
          <input type="hidden" name="savedReturnTo" value="/admin/expeditions" />
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Title" className="lg:col-span-2" required>
              <input id="expedition-title" name="title" placeholder="Raja Ampat Coral Restoration Expedition" className={adminInputClassName} required aria-invalid={invalidFields.has("title") || undefined} />
            </Field>
            <Field label="Slug">
              <input id="expedition-slug" name="slug" placeholder="raja-ampat-coral-restoration" className={adminInputClassName} aria-invalid={invalidFields.has("slug") || undefined} />
            </Field>
            <Field label="Region" required>
              <input id="expedition-region" name="region" placeholder="Raja Ampat" className={adminInputClassName} required aria-invalid={invalidFields.has("region") || undefined} />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Duration days" required>
              <input id="expedition-durationDays" name="durationDays" type="number" min={1} defaultValue={4} className={adminInputClassName} required aria-invalid={invalidFields.has("durationDays") || undefined} />
            </Field>
            <Field label="Base price" required>
              <input id="expedition-basePrice" name="basePrice" type="number" min={1} step={0.01} placeholder="250.00" className={adminInputClassName} required aria-invalid={invalidFields.has("basePrice") || undefined} />
            </Field>
            <Field label="Currency" required>
              <select id="expedition-currency" name="currency" defaultValue="USD" className={adminSelectClassName} required>
                <option value="USD">USD</option>
              </select>
            </Field>
            <Field label="Related campaign">
              <RelatedCampaignSelect campaigns={data.campaignOptions} invalid={invalidFields.has("relatedCampaignId")} />
            </Field>
          </div>
          <Field label="Upload image" help={`${imageUploadHelp} File inputs cannot be restored after a validation redirect.`}>
            <input id="expedition-imageFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} aria-invalid={invalidFields.has("imageFile") || undefined} />
          </Field>
          <Field label="Documentation link">
            <input id="expedition-documentationUrl" name="documentationUrl" type="url" placeholder="https://drive.google.com/..." className={adminInputClassName} />
          </Field>
          <Field label="Summary" required>
            <textarea id="expedition-summary" name="summary" placeholder="Trip summary shown on public expedition cards and detail pages." className={adminTextareaClassName} required aria-invalid={invalidFields.has("summary") || undefined} />
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
