import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDestinationForm } from "@/components/admin-destination-form";
import { AdminPageHeader } from "@/components/admin-ui";
import { requireRole } from "@/lib/auth";

export const metadata = {
  title: "New Destination"
};

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "destination-invalid": "Complete the required destination fields.",
  "destination-slug": "That destination slug is already in use.",
  "destination-not-ready": "Add at least one conservation focus before publishing.",
  "image-size": "Uploaded hero image is too large.",
  "image-type": "Upload a supported hero image."
};

type AdminDestinationNewPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminDestinationNewPage({ searchParams }: AdminDestinationNewPageProps) {
  await requireRole(["admin"], "/admin/destinations/new");
  const params = await searchParams;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Destinations"
        title="Create destination"
        description="Create the canonical destination once; partners can then select it when managing expeditions and impact sites."
        actionHref="/admin/destinations"
        actionLabel="Destination list"
      />
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}
      <AdminDestinationForm returnTo="/admin/destinations/new" />
    </div>
  );
}
