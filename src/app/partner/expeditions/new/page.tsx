import Link from "next/link";

import { PartnerExpeditionCreateForm } from "@/components/partner-expedition-editor";
import { PartnerPageHeader } from "@/components/partner-portal-ui";
import { requirePartnerRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "New Expedition"
};

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing related campaign.",
  "expedition-invalid": "Enter a title, slug, region, duration, price, summary, and related campaign.",
  "expedition-slug": "That expedition slug is already in use.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "partner-permission": "Your partner role cannot create expedition records for that organization."
};

type NewPartnerExpeditionPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function NewPartnerExpeditionPage({ searchParams }: NewPartnerExpeditionPageProps) {
  const user = await requirePartnerRole("/partner");
  const query = await searchParams;
  const data = await getPartnerPortalData(user.id);
  const errorMessage = query?.error ? errorMessages[query.error] ?? "Expedition could not be created." : null;

  return (
    <div className="space-y-6">
      <Link href="/partner/expeditions" className="inline-flex text-sm font-bold text-ocean-900/62 hover:text-coral-700">
        ← Expeditions
      </Link>
      <PartnerPageHeader
        title="New expedition"
        description="Create the core trip record first. Public content, itinerary and logistics, departures, and requests are managed from the expedition workspace after creation."
      />
      {errorMessage ? (
        <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p>
      ) : null}
      <PartnerExpeditionCreateForm campaigns={data.campaigns} canManageExpeditions={data.capabilities.canManageExpeditions} />
    </div>
  );
}
