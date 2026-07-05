import { PartnerExpeditionWorkspace } from "@/components/partner-expedition-editor";
import { PartnerPageHeader } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Partner Expeditions"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "departure-created": "Departure created.",
  "departure-updated": "Departure updated.",
  "expedition-created": "Expedition created.",
  "expedition-updated": "Expedition updated."
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing related campaign.",
  "departure-capacity": "Capacity cannot be lower than seats already booked.",
  "departure-duplicate": "That expedition already has a departure with the same start time.",
  "departure-invalid": "Enter valid departure dates and capacity.",
  "departure-missing": "Departure record was not found.",
  "expedition-campaign-required": "This expedition must be linked to one of your campaigns before partner editing is available.",
  "expedition-invalid": "Enter a title, slug, region, duration, price, summary, and related campaign.",
  "expedition-missing": "Expedition record was not found.",
  "expedition-slug": "That expedition slug is already in use.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "organization-access": "You do not have access to that partner organization."
};

type PartnerExpeditionsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function PartnerExpeditionsPage({ searchParams }: PartnerExpeditionsPageProps) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const query = await searchParams;
  const data = await getPartnerPortalData(user.id);
  const savedMessage = query?.saved ? statusMessages[query.saved] : null;
  const errorMessage = query?.error ? errorMessages[query.error] : null;

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Expeditions"
        description="Manage trip catalog details, public trip-detail content, and departure availability for expeditions linked to your campaigns."
        actionHref="#add-expedition"
        actionLabel="Add expedition"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <PartnerExpeditionWorkspace campaigns={data.campaigns} expeditions={data.expeditions} />
    </div>
  );
}
