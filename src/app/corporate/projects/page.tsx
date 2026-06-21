import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Projects"
};

export const dynamic = "force-dynamic";

export default async function CorporateProjectsPage() {
  const user = await requireUser("/corporate/projects");
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">Corporate program not configured.</main>;
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Project portfolio</p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.program.programName}</h1>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {data.portfolio.map((project) => (
          <article key={project.campaignTitle} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">{project.campaignTitle}</h2>
            <p className="mt-1 text-sm text-ocean-900/58">{project.region}</p>
            <p className="mt-4 text-sm font-bold text-kelp-700">
              {formatCurrency(Number(project.allocationAmount))} · {project.status}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
