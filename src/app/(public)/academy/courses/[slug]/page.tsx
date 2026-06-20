import { SectionHeading } from "@/components/section-heading";
import { ButtonLink } from "@/components/ui/button";

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = slug
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Course" title={title}>
        Course player implementation will connect lessons, progress, assessments, and certificates to the PostgreSQL-backed learning model.
      </SectionHeading>
      <div className="mt-10 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Module 1</p>
        <h2 className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">Understanding healthy reef systems</h2>
        <p className="mt-4 text-ocean-900/68">
          This placeholder establishes the course detail route before lesson content and assessment data are wired in.
        </p>
        <ButtonLink href="/signup" className="mt-6">
          Enroll
        </ButtonLink>
      </div>
    </section>
  );
}

