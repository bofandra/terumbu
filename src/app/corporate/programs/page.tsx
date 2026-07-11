import { BriefcaseBusiness, PlusCircle, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { createCorporateProgramAction, updateCorporateProgramAction } from "@/lib/corporate-actions";
import { getCorporateProgramsForUser } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Programs"
};

export const dynamic = "force-dynamic";

type CorporateProgramsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function dateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

const programStatuses = ["draft", "active", "paused", "completed", "archived"];

export default async function CorporateProgramsPage({ searchParams }: CorporateProgramsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/programs");
  const data = await requireCorporateDashboardData(user.id, "/corporate/programs");
  const registry = await getCorporateProgramsForUser(user.id);

  if (!registry) {
    throw new Error("Corporate program registry was unavailable after access was granted.");
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{data.program.accountName}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Corporate programs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Manage ESG/CSR programs from the corporate workspace so program names, periods, budgets, and statuses are created by real user actions instead of seed data.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-ocean-50 px-4 py-2 text-sm font-bold text-ocean-800">
          <BriefcaseBusiness size={17} aria-hidden="true" />
          {registry.programs.length.toLocaleString("id-ID")} programs
        </span>
      </div>

      {params?.saved ? (
        <p className="mt-6 rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Program saved.</p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Program could not be saved with the current input or permission.</p>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold text-ocean-900/56">Current program budget</p>
          <p className="mt-3 text-2xl font-bold text-ocean-900">{formatCurrency(Number(data.program.budgetAmount))}</p>
        </div>
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold text-ocean-900/56">Current start</p>
          <p className="mt-3 text-2xl font-bold text-ocean-900">{data.program.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
        </div>
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold text-ocean-900/56">Current end</p>
          <p className="mt-3 text-2xl font-bold text-ocean-900">{data.program.endsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
        </div>
      </section>

      {registry.canManagePrograms ? (
        <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase text-coral-700">Create program</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Add an ESG/CSR program</h2>
          <form action={createCorporateProgramAction} className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_150px_150px_170px_110px_140px_auto]">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Program name
              <input name="name" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Starts
              <input name="startsAt" type="date" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Ends
              <input name="endsAt" type="date" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Budget
              <input name="budgetAmount" inputMode="decimal" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Currency
              <input name="currency" defaultValue="IDR" className="min-h-11 rounded-xl border border-ocean-900/12 px-3 text-sm font-semibold text-ocean-900 outline-none" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Status
              <select name="status" defaultValue="active" className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                {programStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <Button type="submit" tone="secondary" className="self-end">
              <PlusCircle size={17} aria-hidden="true" />
              Create
            </Button>
          </form>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase text-coral-700">Program registry</p>
        <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Programs for this corporate account</h2>
        <div className="mt-5 grid gap-4">
          {registry.programs.map((program) => (
            <article key={program.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
              {registry.canManagePrograms ? (
                <form action={updateCorporateProgramAction} className="grid gap-3 lg:grid-cols-[1.2fr_150px_150px_170px_110px_140px_auto]">
                  <input type="hidden" name="programId" value={program.id} />
                  <label className="grid gap-2 text-sm font-bold text-ocean-900">
                    Name
                    <input name="name" defaultValue={program.name} className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none" required />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-ocean-900">
                    Starts
                    <input name="startsAt" type="date" defaultValue={dateInputValue(program.startsAt)} className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none" required />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-ocean-900">
                    Ends
                    <input name="endsAt" type="date" defaultValue={dateInputValue(program.endsAt)} className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none" required />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-ocean-900">
                    Budget
                    <input name="budgetAmount" inputMode="decimal" defaultValue={program.budgetAmountValue} className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none" required />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-ocean-900">
                    Currency
                    <input name="currency" defaultValue={program.currency} className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none" required />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-ocean-900">
                    Status
                    <select name="status" defaultValue={program.status} className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none">
                      {programStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  <Button type="submit" tone="secondary" className="self-end">
                    <Save size={17} aria-hidden="true" />
                    Save
                  </Button>
                </form>
              ) : (
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div>
                    <h3 className="font-bold text-ocean-900">{program.name}</h3>
                    <p className="mt-1 text-sm text-ocean-900/58">{program.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} – {program.endsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                  </div>
                  <div className="text-sm font-bold text-ocean-900">{formatCurrency(program.budgetAmountValue)}</div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
