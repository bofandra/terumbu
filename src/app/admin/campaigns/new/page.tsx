import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { AdminPageHeader, adminInputClassName, adminPanelClassName, adminSelectClassName, adminTextareaClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { createAdminCampaignAction } from "@/lib/portal-actions";
import { getAdminPortalData } from "@/lib/queries";

export const metadata = {
  title: "New Admin Campaign"
};

export const dynamic = "force-dynamic";

const campaignStatuses = ["draft", "review", "published", "funded", "completed", "archived"];

const errorMessages: Record<string, string> = {
  "campaign-invalid": "Enter campaign title, slug, organization, goal, impact target, summary, category, and region.",
  "campaign-slug": "That campaign slug is already in use.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "organization-missing": "Choose an existing partner organization."
};

type AdminCampaignNewPageProps = {
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

function OrganizationSelect({
  organizations
}: {
  organizations: Awaited<ReturnType<typeof getAdminPortalData>>["organizations"];
}) {
  return (
    <select name="organizationId" defaultValue={organizations[0]?.id} className={adminSelectClassName} required>
      {organizations.map((organization) => (
        <option key={organization.id} value={organization.id}>
          {organization.name} / {labelize(organization.type)} / {organization.verification}
        </option>
      ))}
    </select>
  );
}

function StatusSelect() {
  return (
    <select name="status" defaultValue="draft" className={adminSelectClassName}>
      {campaignStatuses.map((status) => (
        <option key={status} value={status}>
          {labelize(status)}
        </option>
      ))}
    </select>
  );
}

export default async function AdminCampaignNewPage({ searchParams }: AdminCampaignNewPageProps) {
  await requireRole(["admin"], "/admin/campaigns/new");
  const params = await searchParams;
  const data = await getAdminPortalData();
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Campaigns"
        title="Create campaign"
        description="Add a platform-owned campaign or register a partner submission for review."
        actionHref="/admin/campaigns"
        actionLabel="Campaign list"
      />

      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Campaign details</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Core content, funding target, impact unit, and publication state.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form action={createAdminCampaignAction} className="grid gap-4 p-4">
          <input type="hidden" name="errorReturnTo" value="/admin/campaigns/new" />
          <input type="hidden" name="savedReturnTo" value="/admin/campaigns" />
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Organization" className="lg:col-span-2">
              <OrganizationSelect organizations={data.organizations} />
            </Field>
            <Field label="Status">
              <StatusSelect />
            </Field>
            <Field label="End date">
              <input name="endsAt" type="date" className={adminInputClassName} />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Title" className="lg:col-span-2">
              <input name="title" placeholder="Restore Raja Ampat Reefs" className={adminInputClassName} required />
            </Field>
            <Field label="Slug">
              <input name="slug" placeholder="restore-raja-ampat-reefs" className={adminInputClassName} />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Category">
              <input name="category" placeholder="Coral Restoration" className={adminInputClassName} required />
            </Field>
            <Field label="Region">
              <input name="region" placeholder="Raja Ampat" className={adminInputClassName} required />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Goal amount">
              <input name="goalAmount" type="number" min={1000} step={1000} placeholder="500000000" className={adminInputClassName} required />
            </Field>
            <Field label="Impact target">
              <input name="impactTarget" type="number" min={1} placeholder="10000" className={adminInputClassName} required />
            </Field>
            <Field label="Impact unit">
              <input name="impactUnit" placeholder="coral fragments" className={adminInputClassName} required />
            </Field>
          </div>
          <Field label="Upload image">
            <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} />
          </Field>
          <Field label="Summary">
            <textarea name="summary" placeholder="Public campaign summary" className={adminTextareaClassName} required />
          </Field>
          <Field label="Story">
            <textarea name="story" placeholder="Long-form campaign story" className={adminTextareaClassName} />
          </Field>
          <Button type="submit" tone="secondary" className="w-fit rounded-lg" disabled={data.organizations.length === 0}>
            <Plus className="size-4" aria-hidden="true" />
            Create Campaign
          </Button>
        </form>
      </section>
    </div>
  );
}
