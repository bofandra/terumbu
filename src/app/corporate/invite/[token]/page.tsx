import { eq } from "drizzle-orm";
import { Building2, CheckCircle2, Clock, MailWarning } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { corporateAccounts, corporateEmployeeInvites, corporateEmployees } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { acceptCorporateEmployeeInviteAction } from "@/lib/corporate-actions";
import { canAcceptCorporateEmployeeInvite } from "@/lib/corporate-lifecycle";

export const metadata = {
  title: "Accept Corporate Invite"
};

export const dynamic = "force-dynamic";

type CorporateInvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function errorMessage(error?: string) {
  const messages: Record<string, string> = {
    missing: "This invite link does not exist or has already been removed.",
    expired: "This invite has expired. Ask your corporate program manager to send a new invite.",
    "email-mismatch": "You are signed in with a different email address than the invited employee.",
    "already-used": "This invite has already been accepted or superseded."
  };

  return error ? messages[error] ?? "This invite could not be accepted." : null;
}

export default async function CorporateInvitePage({ params, searchParams }: CorporateInvitePageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/corporate/invite/${token}`);

  const [invite] = await db
    .select({
      id: corporateEmployeeInvites.id,
      email: corporateEmployeeInvites.email,
      permission: corporateEmployeeInvites.permission,
      status: corporateEmployeeInvites.status,
      expiresAt: corporateEmployeeInvites.expiresAt,
      employeeName: corporateEmployees.name,
      employeeRole: corporateEmployees.role,
      department: corporateEmployees.department,
      accountName: corporateAccounts.name
    })
    .from(corporateEmployeeInvites)
    .innerJoin(corporateEmployees, eq(corporateEmployeeInvites.employeeId, corporateEmployees.id))
    .innerJoin(corporateAccounts, eq(corporateEmployeeInvites.corporateAccountId, corporateAccounts.id))
    .where(eq(corporateEmployeeInvites.token, token))
    .limit(1);

  const queryError = errorMessage(query?.error);
  const decision = invite
    ? canAcceptCorporateEmployeeInvite({
        inviteEmail: invite.email,
        userEmail: user.email,
        inviteStatus: invite.status,
        expiresAt: invite.expiresAt
      })
    : { ok: false, reason: "missing" as const };
  const inlineError = queryError ?? (!decision.ok ? errorMessage(decision.reason ?? undefined) : null);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-ocean-900/10 bg-white p-8 shadow-soft">
        <div className="flex size-12 items-center justify-center rounded-lg bg-ocean-50 text-ocean-700">
          <Building2 size={24} aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Corporate invite</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">
          {invite ? `Join ${invite.accountName}` : "Invite not found"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ocean-900/62">
          Corporate employee access is activated only after the invited person signs in with the invited email and accepts the workspace invite.
        </p>

        {inlineError ? (
          <div className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 p-4 text-sm font-bold text-coral-700">
            <MailWarning size={18} aria-hidden="true" className="mb-2" />
            {inlineError}
          </div>
        ) : null}

        {invite ? (
          <dl className="mt-6 grid gap-3 rounded-lg bg-sand-50 p-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-bold text-ocean-900/56">Invited employee</dt>
              <dd className="font-bold text-ocean-900">{invite.employeeName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-bold text-ocean-900/56">Email</dt>
              <dd className="font-bold text-ocean-900">{invite.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-bold text-ocean-900/56">Role</dt>
              <dd className="font-bold text-ocean-900">{invite.employeeRole}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-bold text-ocean-900/56">Department</dt>
              <dd className="font-bold text-ocean-900">{invite.department ?? "Department pending"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-bold text-ocean-900/56">Expires</dt>
              <dd className="font-bold text-ocean-900">{invite.expiresAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-bold text-ocean-900/56">Signed in as</dt>
              <dd className="font-bold text-ocean-900">{user.email}</dd>
            </div>
          </dl>
        ) : null}

        {invite && decision.ok ? (
          <form action={acceptCorporateEmployeeInviteAction} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <Button type="submit">
              <CheckCircle2 size={18} aria-hidden="true" />
              Accept invite
            </Button>
          </form>
        ) : (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-ocean-50 px-4 py-2 text-sm font-bold text-ocean-800">
            <Clock size={17} aria-hidden="true" />
            Invite cannot be accepted in the current state
          </div>
        )}
      </section>
    </main>
  );
}
