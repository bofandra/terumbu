import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { AdminPageHeader, adminInputClassName, adminPanelClassName, adminSelectClassName, adminTextareaClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { createOrganizationAction } from "@/lib/portal-actions";

export const metadata = {
  title: "New Admin Partner"
};

export const dynamic = "force-dynamic";

const verificationLevels = ["basic", "document", "field"];
const organizationTypes = ["ngo", "community_cooperative", "community_group", "corporate_partner", "government", "research"];

const errorMessages: Record<string, string> = {
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "partner-invalid": "Enter a partner name, slug, and type.",
  "partner-slug": "That partner slug is already in use."
};

type AdminPartnerNewPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

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
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Partners"
        title="Create partner"
        description="Create an organization record before assigning users or linking campaigns."
        actionHref="/admin/partners"
        actionLabel="Partner list"
      />

      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Partner details</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Public trust profile, type, and initial verification level.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form action={createOrganizationAction} className="grid gap-4 p-4">
          <input type="hidden" name="errorReturnTo" value="/admin/partners/new" />
          <input type="hidden" name="savedReturnTo" value="/admin/partners" />
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Name" className="lg:col-span-2">
              <input name="name" placeholder="Yayasan Laut Baru" className={adminInputClassName} required />
            </Field>
            <Field label="Slug">
              <input name="slug" placeholder="yayasan-laut-baru" className={adminInputClassName} />
            </Field>
            <Field label="Type">
              <select name="type" defaultValue="ngo" className={adminSelectClassName}>
                {organizationTypes.map((type) => (
                  <option key={type} value={type}>
                    {labelize(type)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Website URL">
              <input name="websiteUrl" type="url" placeholder="https://..." className={adminInputClassName} />
            </Field>
            <Field label="Upload logo">
              <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} />
            </Field>
            <Field label="Verification">
              <select name="verification" defaultValue="basic" className={adminSelectClassName}>
                {verificationLevels.map((verification) => (
                  <option key={verification} value={verification}>
                    {verification}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea name="description" placeholder="Public partner profile summary" className={adminTextareaClassName} />
          </Field>
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Plus className="size-4" aria-hidden="true" />
            Create Partner
          </Button>
        </form>
      </section>
    </div>
  );
}
