import { BadgeCheck, Building2, Handshake, KeyRound, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminUserWorkspace } from "@/components/admin/admin-user-workspace";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { safeAdminUsersReturnPath } from "@/lib/admin-user-management";
import { requireRole } from "@/lib/auth";
import { getAdminUserWorkspaceData } from "@/lib/queries";

export const metadata = {
  title: "Manage Admin User"
};

export const dynamic = "force-dynamic";

const savedMessages: Record<string, string> = {
  "corporate-removed": "Corporate access removed.",
  "corporate-saved": "Corporate access saved.",
  "global-role-assigned": "Global role assigned.",
  "global-role-revoked": "Global role revoked.",
  "partner-removed": "Partner membership removed.",
  "partner-saved": "Partner membership saved.",
  "password-disabled": "Password login disabled and sessions cleared.",
  "password-reset": "Password reset email queued.",
  "sessions-cleared": "User sessions cleared.",
  "user-updated": "User profile saved.",
  "verification-sent": "Setup or verification email queued."
};

const errorMessages: Record<string, string> = {
  "admin-last": "At least one admin account must remain.",
  "admin-self": "You cannot remove or disable your own admin access from this screen.",
  "corporate-invalid": "Choose a valid user and corporate account.",
  "delete-confirm": "Confirm destructive actions before submitting.",
  "partner-invalid": "Choose a valid user, organization, partner role, and status.",
  "role-missing": "Role assignment was not found.",
  "session-self": "You cannot clear your own active admin session here.",
  "user-exists": "Another user already uses that email address.",
  "user-invalid": "Enter a valid name and email.",
  "user-missing": "User account was not found.",
  "user-verified": "That user's email is already verified."
};

type AdminUserDetailPageProps = {
  params: Promise<{
    userId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    saved?: string;
    returnTo?: string;
  }>;
};

export default async function AdminUserDetailPage({ params, searchParams }: AdminUserDetailPageProps) {
  await requireRole(["admin"], "/admin/users");
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  const data = await getAdminUserWorkspaceData(userId);

  if (!data.user) {
    notFound();
  }

  const user = data.user;
  const displayName = user.displayName ?? user.name ?? user.email;
  const directoryReturnTo = safeAdminUsersReturnPath(query?.returnTo);
  const detailReturnTo = `/admin/users/${user.id}?returnTo=${encodeURIComponent(directoryReturnTo)}`;
  const savedMessage = query?.saved ? savedMessages[String(query.saved)] : null;
  const errorMessage = query?.error ? errorMessages[String(query.error)] : null;
  const hasPartnerAccess = user.partnerMemberships.some((membership) => membership.status === "active");
  const hasCorporateAccess = user.corporatePermissions.length > 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Users / Account"
        title={displayName}
        description={`${user.email} · ${user.activeSessions.toLocaleString("id-ID")} active sessions`}
        actionHref={directoryReturnTo}
        actionLabel="Back to users"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="User account summary">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ocean-900/58">Email</p>
              <p className="mt-2 font-bold text-ocean-900">{user.emailVerifiedAt ? "Verified" : "Pending"}</p>
            </div>
            <BadgeCheck className={user.emailVerifiedAt ? "size-5 text-kelp-700" : "size-5 text-ocean-900/30"} aria-hidden="true" />
          </div>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ocean-900/58">Global roles</p>
              <p className="mt-2 text-2xl font-bold text-ocean-900">{user.roles.length.toLocaleString("id-ID")}</p>
            </div>
            <ShieldCheck className="size-5 text-ocean-700" aria-hidden="true" />
          </div>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ocean-900/58">Partner memberships</p>
              <p className="mt-2 text-2xl font-bold text-ocean-900">{user.partnerMemberships.length.toLocaleString("id-ID")}</p>
            </div>
            <Handshake className="size-5 text-kelp-700" aria-hidden="true" />
          </div>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ocean-900/58">Corporate accounts</p>
              <p className="mt-2 text-2xl font-bold text-ocean-900">{user.corporatePermissions.length.toLocaleString("id-ID")}</p>
            </div>
            <Building2 className="size-5 text-ocean-700" aria-hidden="true" />
          </div>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ocean-900/58">Password</p>
              <p className="mt-2 font-bold text-ocean-900">{user.hasPassword ? "Enabled" : "Disabled"}</p>
            </div>
            <KeyRound className="size-5 text-coral-700" aria-hidden="true" />
          </div>
        </article>
      </section>

      <div className="flex flex-wrap gap-2" aria-label="Access summary">
        {user.roles.map((role) => <AdminStatusBadge key={role.id} value={role.key} />)}
        {hasPartnerAccess && !user.roles.some((role) => role.key === "partner") ? <AdminStatusBadge value="partner" /> : null}
        {hasCorporateAccess && !user.roles.some((role) => role.key === "corporate_admin") ? <AdminStatusBadge value="corporate" /> : null}
        {user.roles.length === 0 && !hasPartnerAccess && !hasCorporateAccess ? <AdminStatusBadge value="basic" /> : null}
      </div>

      <AdminUserWorkspace data={data} user={user} returnTo={detailReturnTo} deleteReturnTo={directoryReturnTo} />
    </div>
  );
}
