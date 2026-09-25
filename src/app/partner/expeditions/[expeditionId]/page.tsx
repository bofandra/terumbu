import { notFound } from "next/navigation";

import { PartnerExpeditionDetailWorkspace } from "@/components/partner-expedition-editor";
import { requirePartnerRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Manage Expedition"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "expedition-created": "Expedition created. Continue with public content, itinerary and logistics, and departure dates.",
  "departure-created": "Departure created.",
  "departure-updated": "Departure updated.",
  "expedition-updated": "Expedition updated.",
  "interest-request": "Expedition request updated."
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing related campaign.",
  "departure-capacity": "Capacity cannot be lower than seats already booked.",
  "departure-cancelled-final": "A cancelled departure cannot be reopened. Create a new departure for a replacement schedule.",
  "departure-cancel-started": "A departure cannot be cancelled after its start time.",
  "departure-duplicate": "That expedition already has a departure with the same start time.",
  "departure-invalid": "Enter valid departure dates and capacity.",
  "departure-missing": "Departure record was not found.",
  "expedition-campaign-required": "This expedition must remain linked to one of your campaigns.",
  "expedition-invalid": "Enter a title, slug, region, duration, price, summary, and related campaign.",
  "expedition-missing": "Expedition record was not found.",
  "expedition-slug": "That expedition slug is already in use.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "interest-request-invalid": "Choose an expedition request and final processing status.",
  "interest-request-missing": "Expedition request record was not found.",
  "organization-access": "You do not have access to that partner organization.",
  "partner-permission": "Your partner role cannot manage expedition records for that organization."
};

type PartnerExpeditionDetailPageProps = {
  params: Promise<{
    expeditionId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    saved?: string;
    tab?: string;
  }>;
};

export default async function PartnerExpeditionDetailPage({ params, searchParams }: PartnerExpeditionDetailPageProps) {
  const user = await requirePartnerRole("/partner");
  const [{ expeditionId }, query] = await Promise.all([params, searchParams]);
  const data = await getPartnerPortalData(user.id);
  const expedition = data.expeditions.find((item) => item.id === expeditionId);

  if (!expedition) {
    notFound();
  }

  const savedMessage = query?.saved ? statusMessages[query.saved] ?? "Expedition changes saved." : null;
  const errorMessage = query?.error ? errorMessages[query.error] ?? "Expedition changes could not be saved." : null;

  return (
    <div className="space-y-6">
      {savedMessage ? (
        <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p>
      ) : null}
      <PartnerExpeditionDetailWorkspace
        campaigns={data.campaigns}
        expedition={expedition}
        canManageExpeditions={data.capabilities.canManageExpeditions}
        defaultTabId={query?.tab}
      />
    </div>
  );
}
