import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { updateOrganizationVerificationAction } from "@/lib/portal-actions";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Partners"
};

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  await requireRole(["admin"], "/admin/partners");
  const data = await getAdminOperationsData();

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-bold text-coral-700 hover:text-coral-500">Admin overview</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-normal text-ocean-900">Partner verification</h1>
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {data.partners.map((partner) => (
            <form key={partner.id} action={updateOrganizationVerificationAction} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <input type="hidden" name="organizationId" value={partner.id} />
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">{partner.name}</h2>
              <p className="mt-1 text-sm text-ocean-900/58">{partner.type}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <select name="verification" defaultValue={partner.verification} className="rounded-xl border border-ocean-900/14 px-3 py-2 text-sm font-semibold">
                  <option value="basic">Basic</option>
                  <option value="document">Document</option>
                  <option value="field">Field</option>
                </select>
                <Button type="submit" tone="secondary">Save</Button>
              </div>
            </form>
          ))}
        </section>
      </div>
    </main>
  );
}
