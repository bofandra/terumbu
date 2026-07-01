import { Handshake, Save } from "lucide-react";

import { AdminPageHeader, AdminStatusBadge, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { updateOrganizationVerificationAction } from "@/lib/portal-actions";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Partners"
};

export const dynamic = "force-dynamic";

const verificationLevels = ["basic", "document", "field"];

export default async function AdminPartnersPage() {
  await requireRole(["admin"], "/admin/partners");
  const data = await getAdminOperationsData();

  const fieldVerified = data.partners.filter((partner) => partner.verification === "field").length;
  const documentVerified = data.partners.filter((partner) => partner.verification === "document").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Partners"
        title="Partner verification"
        description="Track partner verification levels and keep public trust signals aligned with review depth."
        actionHref="/admin"
        actionLabel="Overview"
      />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Partner summary">
        {[
          { label: "Partners", value: data.partners.length.toLocaleString("id-ID") },
          { label: "Document verified", value: documentVerified.toLocaleString("id-ID") },
          { label: "Field verified", value: fieldVerified.toLocaleString("id-ID") }
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
            <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Verification queue</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Partner trust status by organization</p>
          </div>
          <Handshake className="size-5 text-coral-700" aria-hidden="true" />
        </div>

        <div className="divide-y divide-ocean-900/10">
          {data.partners.map((partner) => (
            <form key={partner.id} action={updateOrganizationVerificationAction} className="p-4">
              <input type="hidden" name="organizationId" value={partner.id} />
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-normal text-ocean-900">{partner.name}</h2>
                    <AdminStatusBadge value={partner.verification} />
                  </div>
                  <p className="mt-1 text-sm font-semibold capitalize text-ocean-900/58">{partner.type.replace(/_/g, " ")}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <select name="verification" defaultValue={partner.verification} className={adminSelectClassName}>
                    {verificationLevels.map((verification) => (
                      <option key={verification} value={verification}>
                        {verification}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" tone="secondary" className="min-h-10 px-4">
                    <Save className="size-4" aria-hidden="true" />
                    Save
                  </Button>
                </div>
              </div>
            </form>
          ))}
          {data.partners.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/58">No partners found.</p> : null}
        </div>
      </section>
    </div>
  );
}
