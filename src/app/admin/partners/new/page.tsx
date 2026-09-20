import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminFormDraftPersistence } from "@/components/admin/admin-form-draft-persistence";
import { AdminFormErrorSummary, type AdminFormErrorItem } from "@/components/admin/admin-form-error-summary";
import { AdminPageHeader, adminInputClassName, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { adminFormFieldNames } from "@/lib/admin-form-state";
import { requireRole } from "@/lib/auth";
import { impactSiteVerificationStatuses } from "@/lib/campaign-content";
import { createOrganizationAction } from "@/lib/portal-actions";

export const metadata = {
  title: "New Partner"
};

export const dynamic = "force-dynamic";

const organizationTypes = ["ngo", "community_cooperative", "community_group", "corporate_partner", "government", "research"];

const errorMessages: Record<string, string> = {
  "image-size": "Uploaded image is too large. Choose a smaller file and submit again.",
  "image-type": "Upload a supported image file and submit again.",
  "partner-invalid": "Some required partner fields need attention. Your input has been preserved.",
  "partner-slug": "That partner name is already in use. Your input has been preserved."
};

type SearchValue = string | string[] | undefined;
type AdminPartnerNewPageProps = {
  searchParams?: Promise<{
    error?: SearchValue;
    field?: SearchValue;
  }>;
};

const partnerFieldDefinitions: Record<string, AdminFormErrorItem> = {
  name: { fieldId: "partner-name", label: "Partner name", message: "Enter a unique partner name." },
  type: { fieldId: "partner-type", label: "Partner type", message: "Choose a partner type." },
  logoFile: { fieldId: "partner-logoFile", label: "Partner logo", message: "Choose a supported image file again." }
};

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-ocean-900 ${className}`}>
      {label}
      {children}
    </label>
  );
}

export default async function AdminPartnerNewPage({ searchParams }: AdminPartnerNewPageProps) {
  await requireRole(["admin"], "/admin/partners/new");
  const params = await searchParams;
  const errorCode = first(params?.error);
  const errorMessage = errorCode ? errorMessages[errorCode] : null;
  const invalidFieldNames = adminFormFieldNames(params?.field);
  const invalidFields = new Set(invalidFieldNames);
  const fieldErrors = invalidFieldNames.flatMap((field) => partnerFieldDefinitions[field] ? [partnerFieldDefinitions[field]] : []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Partners"
        title="Create partner"
        description="Add the basic partner record first. Details can be completed later."
        actionHref="/admin/partners"
        actionLabel="Back to partners"
      />

      {errorMessage ? <AdminAlert tone="error" title="Partner was not created">{errorMessage}</AdminAlert> : null}
      <AdminFormErrorSummary errors={fieldErrors} />

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Partner</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Only the fields needed to start.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form id="admin-partner-create-form" action={createOrganizationAction} encType="multipart/form-data" className="grid gap-4 p-4">
          <AdminFormDraftPersistence
            formId="admin-partner-create-form"
            storageKey="terumbu:admin:create-partner"
            restore={Boolean(errorCode)}
            focusFieldId={fieldErrors[0]?.fieldId}
          />
          <input type="hidden" name="errorReturnTo" value="/admin/partners/new" />
          <input type="hidden" name="savedReturnTo" value="/admin/partners" />
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Partner name">
              <input id="partner-name" name="name" placeholder="Yayasan Laut Baru" className={adminInputClassName} required aria-invalid={invalidFields.has("name") || undefined} />
            </Field>
            <Field label="Partner type">
              <select id="partner-type" name="type" defaultValue="ngo" className={adminSelectClassName} aria-invalid={invalidFields.has("type") || undefined}>
                {organizationTypes.map((type) => (
                  <option key={type} value={type}>
                    {labelize(type)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Verification level">
              <select id="partner-verification" name="verification" defaultValue="basic" className={adminSelectClassName}>
                {impactSiteVerificationStatuses.map((verification) => (
                  <option key={verification} value={verification}>
                    {verification}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Plus className="size-4" aria-hidden="true" />
            Create partner
          </Button>
        </form>
      </section>
    </div>
  );
}
