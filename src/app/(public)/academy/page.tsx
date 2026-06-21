import { Award, BookOpen, CheckCircle2 } from "lucide-react";

import { SectionHeading } from "@/components/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { getAcademyOverviewStats, getCourses } from "@/lib/queries";

export const metadata = {
  title: "Academy"
};

export const dynamic = "force-dynamic";

export default async function AcademyPage() {
  const [courses, academyStats] = await Promise.all([getCourses(), getAcademyOverviewStats()]);
  const firstCourseHref = courses[0] ? `/academy/courses/${courses[0].slug}` : "/academy";

  return (
    <>
      <section className="bg-ocean-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">Terumbu Academy</p>
            <h1 className="mt-4 text-4xl font-bold tracking-normal sm:text-5xl">
              Learn conservation, then apply it in the field
            </h1>
            <p className="mt-5 text-lg leading-8 text-white/74">
              Courses prepare supporters, students, expedition participants, and corporate teams to understand the impact they fund.
            </p>
            <ButtonLink href={firstCourseHref} tone="light" className="mt-8">
              Start Learning
            </ButtonLink>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {academyStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/16 bg-white/10 p-5 backdrop-blur">
                <p className="text-3xl font-bold tracking-normal">{stat.value}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Learning tracks" title="Courses connected to real conservation action">
          Academy progress can become certificate records and Impact Passport milestones.
        </SectionHeading>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {courses.map((course) => (
            <article key={course.slug} className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
              <BookOpen className="text-coral-500" size={25} aria-hidden="true" />
              <p className="mt-5 text-sm font-bold uppercase tracking-[0.14em] text-ocean-900/54">{course.level}</p>
              <h2 className="mt-3 text-xl font-bold tracking-normal text-ocean-900">{course.title}</h2>
              <p className="mt-3 text-sm leading-6 text-ocean-900/68">{course.summary}</p>
              <div className="mt-5 flex items-center justify-between text-sm font-semibold text-ocean-900/62">
                <span>{course.duration}</span>
                <span className="inline-flex items-center gap-1 text-kelp-700">
                  <Award size={16} aria-hidden="true" />
                  Certificate
                </span>
              </div>
              <ButtonLink href={`/academy/courses/${course.slug}`} tone="secondary" className="mt-5 w-full">
                Open Course
              </ButtonLink>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Learn-to-action pathway" />
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {["Choose a track", "Complete lessons", "Pass assessment", "Apply in field"].map((step) => (
              <div key={step} className="rounded-2xl bg-sand-50 p-5">
                <CheckCircle2 className="text-kelp-500" size={22} aria-hidden="true" />
                <p className="mt-4 font-bold text-ocean-900">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
