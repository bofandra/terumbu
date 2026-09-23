import { Building2, CalendarRange, CircleDollarSign, Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createCorporateProgramAction, updateCorporateProgramAction } from "@/lib/corporate-actions";
import { requireCorporateAdminRole } from "@/lib/auth";
import { getCorporateProgramsForUser } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Programs"
};

export const dynamic = "force-dynamic";

const inputClassName =
  "min-h-11 w-full rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition focus:border-coral-500 focus:ring-2 focus:ring-coral-500/15";

const statusOptions = ["draft", "active", "completed", "archived"] as const;

const savedMessages: Record<string, string> = {
  program: "Program saved."
};

const errorMessages: Record<string, string> = {
  permission: "Only Corporate Admin can manage programs.",
  program: "Enter a valid program name, period, budget, currency, and status."
};

function dateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/w/g, (character) => character.toUpperCase());
}

export default async function CorporateProgramsPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireCorporateAdminRole("/corporate/programs");
  const [data, query] = await Promise.all([getCorporateProgramsForUser(user.id), searchParams]);

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6">
          <h1 className="text-xl font-bold text-ocean-900">Corporate account access required</h1>
          <p className="mt-2 text-sm font-semibold text-ocean-900/58">
            Ask Platform Admin to assign this Corporate Admin to a corporate account before creating programs.
          </p>
        </div>
      </main>
    );
  }

  const savedMessage = query?.saved ? savedMessages[query.saved] : null;
  const errorMessage = query?.error ? errorMessages[query.error] : null;
  const activePrograms = data.programs.filter((program) => program.status === "active").length;
  const totalBudget = data.programs.reduce((total, program) => total + program.budgetAmountValue, 0);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="border-b border-ocean-900/10 pb-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Corporate Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Programs</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ocean-900/58">
          Create and manage the programs, budgets, periods, and lifecycle owned by {data.account.accountName}.
        </p>
      </header>

      {savedMessage ? (
        <p className="mt-6 rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">
          {savedMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-6 rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">
          {errorMessage}
        </p>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Program summary">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ocean-900/58">Programs</p>
              <p className="mt-2 text-2xl font-bold text-ocean-900">{data.programs.length.toLocaleString("id-ID")}</p>
            </div>
            <Building2 className="size-5 text-ocean-700" aria-hidden="true" />
          </div>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ocean-900/58">Active programs</p>
              <p className="mt-2 text-2xl font-bold text-ocean-900">{activePrograms.toLocaleString("id-ID")}</p>
            </div>
            <CalendarRange className="size-5 text-ocean-700" aria-hidden="true" />
          </div>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ocean-900/58">Combined budget</p>
              <p className="mt-2 text-2xl font-bold text-ocean-900">{formatCurrency(totalBudget, data.programs[0]?.currency ?? "USD")}</p>
            </div>
            <CircleDollarSign className="size-5 text-ocean-700" aria-hidden="true" />
          </div>
        </article>
      </section>

      <details className="mt-6 rounded-lg border border-ocean-900/10 bg-white shadow-soft" open={data.programs.length === 0}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-bold text-coral-700">
          <Plus className="size-4" aria-hidden="true" />
          Create program
        </summary>
        <form action={createCorporateProgramAction} className="grid gap-4 border-t border-ocean-900/10 p-5">
          <div>
            <h2 className="text-xl font-bold text-ocean-900">New corporate program</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/54">
              Program ownership stays with Corporate Admin. Platform Admin can only monitor these values.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Program name
              <input name="name" className={inputClassName} placeholder="Ocean Impact Program 2027" required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Status
              <select name="status" defaultValue="draft" className={inputClassName}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{labelize(status)}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Starts
              <input name="startsAt" type="date" className={inputClassName} required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Ends
              <input name="endsAt" type="date" className={inputClassName} required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Budget
              <input name="budgetAmount" type="number" min="1" step="0.01" className={inputClassName} required />
            </label>
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Currency
              <select name="currency" defaultValue="USD" className={inputClassName}>
                <option value="USD">USD</option>
                <option value="IDR">IDR</option>
              </select>
            </label>
          </div>
          <Button type="submit" className="w-fit">
            <Plus className="size-4" aria-hidden="true" />
            Create program
          </Button>
        </form>
      </details>

      <section className="mt-6 grid gap-4">
        {data.programs.map((program) => (
          <article key={program.id} className="rounded-lg border border-ocean-900/10 bg-white shadow-soft">
            <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-5 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-xl font-bold text-ocean-900">{program.name}</h2>
                <p className="mt-1 text-sm font-semibold text-ocean-900/52">/{program.slug}</p>
                <p className="mt-2 text-sm font-bold text-ocean-900">{formatCurrency(program.budgetAmountValue, program.currency)}</p>
              </div>
              <span className="inline-flex min-h-8 items-center rounded-full bg-ocean-50 px-3 text-xs font-bold capitalize text-ocean-900">
                {labelize(program.status)}
              </span>
            </div>
            <form action={updateCorporateProgramAction} className="grid gap-4 p-5">
              <input type="hidden" name="programId" value={program.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Program name
                  <input name="name" defaultValue={program.name} className={inputClassName} required />
                </label>
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Status
                  <select name="status" defaultValue={program.status} className={inputClassName}>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{labelize(status)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Starts
                  <input name="startsAt" type="date" defaultValue={dateInputValue(program.startsAt)} className={inputClassName} required />
                </label>
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Ends
                  <input name="endsAt" type="date" defaultValue={dateInputValue(program.endsAt)} className={inputClassName} required />
                </label>
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Budget
                  <input name="budgetAmount" type="number" min="1" step="0.01" defaultValue={program.budgetAmountValue} className={inputClassName} required />
                </label>
                <label className="grid gap-2 text-sm font-bold text-ocean-900">
                  Currency
                  <select name="currency" defaultValue={program.currency} className={inputClassName}>
                    <option value="USD">USD</option>
                    <option value="IDR">IDR</option>
                  </select>
                </label>
              </div>
              <Button type="submit" tone="secondary" className="w-fit">
                <Save className="size-4" aria-hidden="true" />
                Save program
              </Button>
            </form>
          </article>
        ))}

        {data.programs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6">
            <h2 className="font-bold text-ocean-900">No programs yet.</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/54">
              Create the first program above. Program creation is intentionally unavailable to Platform Admin.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
