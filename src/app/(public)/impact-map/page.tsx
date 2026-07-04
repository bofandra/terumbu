import { ImpactMapPreview } from "@/components/impact-map-preview";
import { SectionHeading } from "@/components/section-heading";
import { getImpactMapSites } from "@/lib/queries";

export const metadata = {
  title: "Impact Map"
};

export const dynamic = "force-dynamic";

export default async function ImpactMapPage() {
  const sites = await getImpactMapSites();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Impact Map" title="A national view of verified conservation work">
        Browse impact sites, verification status, evidence counts, and approximate field locations in one public view.
      </SectionHeading>
      <div className="mt-10">
        <ImpactMapPreview sites={sites} />
      </div>
    </section>
  );
}
