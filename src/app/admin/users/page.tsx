import Link from "next/link";
import { ArrowUpDown, BadgeCheck, Building2, Handshake, KeyRound, LockKeyhole, Mail, ShieldCheck, UserPlus, Users } from "lucide-react";
import type { ReactNode } from "react";

import { AdminCreateUserAccessFields } from "@/components/admin-create-user-access-fields";
import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminConfirmSubmit } from "@/components/admin/admin-confirm-submit";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminInputClassName, adminSelectClassName, adminTextareaClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { createAdminUserAction, createGlobalRoleAction, deleteGlobalRoleAction, updateGlobalRoleAction } from "@/lib/admin-user-actions";
import { adminCreateUserAccessOptions, isSystemGlobalRole, systemGlobalRoleOptions } from "@/lib/admin-user-management";
import { requireRole } from "@/lib/auth";
import { partnerOrganizationRoles } from "@/lib/partner-permissions";
import { getAdminUserManagementOptions, getAdminUsersPage, type AdminUserFilters } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Admin Users"
};

export const dynamic = "force-dynamic";

const pathname = "/admin/users";

const savedMessages: Record<string, string> = {
  "corporate-removed": "Corporate access removed.",
  "corporate-saved": "Corporate access saved.",
  "global-role-assigned": "Global role assigned.",
  "global-role-revoked": "Global role revoked.",
  "partner-removed": "Partner membership removed.",
  "partner-saved": "Partner membership saved.",
  "password-disabled": "Password login disabled and sessions cleared.",
  "password-reset": "Password reset email queued.",
  "role-deleted": "Role deleted.",
  "role-saved": "Role catalog saved.",
  "sessions-cleared": "User sessions cleared.",
  "user-created": "User account created and setup email queued.",
  "user-deleted": "User account deleted.",
  "user-updated": "User profile saved.",
  "verification-sent": "Setup or verification email queued."
};

const errorMessages: Record<string, string> = {
  "admin-last": "At least one admin account must remain.",
  "admin-self": "You cannot remove or disable your own admin access from this screen.",
  "corporate-invalid": "Choose a valid user and corporate account.",
  "delete-confirm": "Confirm destructive actions before submitting.",
  "partner-invalid": "Choose a valid user, organization, partner role, and status.",
  "role-assigned": "Remove all assignments before deleting this role.",
  "role-invalid": "Enter a valid role key and role name.",
  "role-missing": "Role assignment was not found.",
  "role-system": "System roles cannot be deleted.",
  "session-self": "You cannot clear your own active admin session here.",
  "user-exists": "Another user already uses that email address.",
  "user-invalid": "Enter a valid name and email.",
  "user-missing": "User account was not found.",
  "user-verified": "That user's email is already verified."
};

type AdminUsersPageProps = {
  searchParams?: Promise<
    AdminUserFilters & {
      error?: string;
      saved?: string;
    }
  >;
};

type AdminUsersData = Awaited<ReturnType<typeof getAdminUsersPage>>;
type AdminDirectoryUser = AdminUsersData["users"][number];

function adminUsersHref(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function listParams(data: AdminUsersData) {
  return {
    q: data.filters.q || undefined,
    verification: data.filters.verification === "all" ? undefined : data.filters.verification,
    access: data.filters.access === "all" ? undefined : data.filters.access,
    sort: data.filters.sort === "createdAt" ? undefined : data.filters.sort,
    dir: data.filters.dir === "desc" ? undefined : data.filters.dir
  };
}

function defaultUsersTab(data: AdminUsersData, params: { error?: string; saved?: string } | undefined) {
  if (data.filters.q || data.filters.verification !== "all" || data.filters.access !== "all" || data.pagination.page > 1) {
    return "manage";
  }

  if (params?.saved === "role-deleted" || params?.saved === "role-saved" || params?.error?.startsWith("role-")) {
    return "roles";
  }

  if (params?.saved === "user-created" || params?.error === "user-exists" || params?.error === "user-invalid") {
    return "create";
  }

  if (params?.saved || params?.error) {
    return "manage";
  }

  return "manage";
}

function HiddenReturn({ value }: { value: string }) {
  return <input type="hidden" name="returnTo" value={value} />;
}

function Field({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <label className={`grid gap-2 text-sm font-bold text-ocean-900 ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}

function SortHeader({ label, sort, data }: { label: string; sort: string; data: AdminUsersData }) {
  const active = data.filters.sort === sort;
  const nextDir = active && data.filters.dir === "asc" ? "desc" : "asc";

  return (
    <Link
      href={adminUsersHref({ ...listParams(data), sort, dir: nextDir, page: 1 })}
      className="inline-flex items-center gap-1 rounded-md text-ocean-900/70 transition hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
    >
      {label}
      <ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" />
    </Link>
  );
}

function UserAccessSummary({ user }: { user: AdminDirectoryUser }) {
  const showBasic = user.roleKeys.length === 0 && !user.hasPartnerAccess && !user.hasCorporateAccess;

  return (
    <div className="flex min-w-44 flex-wrap gap-1.5">
      {user.roleKeys.slice(0, 3).map((role) => <AdminStatusBadge key={role} value={role} />)}
      {user.roleKeys.length > 3 ? <span className="text-xs font-bold text-ocean-900/48">+{user.roleKeys.length - 3}</span> : null}
      {user.hasPartnerAccess && !user.roleKeys.includes("partner") ? <AdminStatusBadge value="partner" /> : null}
      {user.hasCorporateAccess && !user.roleKeys.includes("corporate_admin") ? <AdminStatusBadge value="corporate" /> : null}
      {showBasic ? <AdminStatusBadge value="basic" /> : null}
    </div>
  );
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireRole(["admin"], pathname);
  const params = await searchParams;
  const [data, options] = await Promise.all([getAdminUsersPage(params), getAdminUserManagementOptions()]);
  const savedMessage = params?.saved ? savedMessages[String(params.saved)] : null;
  const errorMessage = params?.error ? errorMessages[String(params.error)] : null;
  const customGlobalRoleOptions = options.roleOptions.filter((role) => !isSystemGlobalRole(role.key));
  const baseParams = listParams(data);
  const returnTo = adminUsersHref({ ...baseParams, page: data.pagination.page });
  const columns: AdminDataTableColumn<AdminDirectoryUser>[] = [
    {
      key: "user",
      header: <SortHeader label="User" sort="name" data={data} />,
      render: (user) => (
        <div className="min-w-56">
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/users/${user.id}?returnTo=${encodeURIComponent(returnTo)}`}
              className="font-bold text-ocean-900 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
            >
              {user.displayName ?? user.name ?? user.email}
            </Link>
            {user.emailVerifiedAt ? <BadgeCheck className="size-4 text-kelp-700" aria-label="Email verified" /> : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">{user.email}</p>
          {user.location ? <p className="mt-1 text-xs font-semibold text-ocean-900/44">{user.location}</p> : null}
        </div>
      )
    },
    {
      key: "access",
      header: <SortHeader label="Access" sort="access" data={data} />,
      render: (user) => <UserAccessSummary user={user} />
    },
    {
      key: "scopes",
      header: "Scoped access",
      render: (user) => (
        <div className="min-w-36 text-sm font-semibold text-ocean-900/68">
          <p>{user.membershipCount.toLocaleString("id-ID")} partner memberships</p>
          <p className="mt-1">{user.permissionCount.toLocaleString("id-ID")} corporate accounts</p>
        </div>
      )
    },
    {
      key: "security",
      header: <SortHeader label="Security" sort="sessions" data={data} />,
      render: (user) => (
        <div className="min-w-36 space-y-1 text-sm font-semibold">
          <p className={user.emailVerifiedAt ? "text-kelp-700" : "text-ocean-900/52"}>{user.emailVerifiedAt ? "Verified email" : "Email pending"}</p>
          <p className={user.hasPassword ? "text-ocean-900/68" : "text-coral-700"}>{user.hasPassword ? "Password enabled" : "No password"}</p>
          <p className="text-ocean-900/52">{user.activeSessions.toLocaleString("id-ID")} active sessions</p>
        </div>
      )
    },
    {
      key: "created",
      header: <SortHeader label="Joined" sort="createdAt" data={data} />,
      render: (user) => (
        <time dateTime={user.createdAt.toISOString()} className="whitespace-nowrap font-semibold text-ocean-900/62">
          {user.createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
        </time>
      )
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      render: (user) => (
        <Link
          href={`/admin/users/${user.id}?returnTo=${encodeURIComponent(returnTo)}`}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
        >
          Manage
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Users"
        title="User and role management"
        description="Search the user directory, then open one focused workspace to manage profile, credentials, roles, partner membership, and corporate access."
        actionHref="/admin/audit"
        actionLabel="Audit Log"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-5" aria-label="User summary">
        {[
          { label: "Users", value: data.summary.users.toLocaleString("id-ID"), icon: Users },
          { label: "Verified", value: data.summary.verifiedUsers.toLocaleString("id-ID"), icon: BadgeCheck },
          { label: "Admins", value: data.summary.admins.toLocaleString("id-ID"), icon: ShieldCheck },
          { label: "Partners", value: data.summary.partnerUsers.toLocaleString("id-ID"), icon: Handshake },
          { label: "Corporate", value: data.summary.corporateUsers.toLocaleString("id-ID"), icon: Building2 }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <MetricValue className="mt-3 text-ocean-900">{item.value}</MetricValue>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sand-100 text-ocean-900">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <FormTabs
        ariaLabel="Admin user workflows"
        defaultTabId={defaultUsersTab(data, params)}
        tabs={[
          { id: "manage", label: "Manage Users", description: "Directory and access", badge: data.pagination.totalItems.toLocaleString("id-ID") },
          { id: "create", label: "Create User", description: "New account setup" },
          { id: "roles", label: "Role Catalog", description: "Global role names", badge: options.roles.length.toLocaleString("id-ID") }
        ]}
      >
        <section className="grid gap-4">
          <AdminListToolbar
            action={pathname}
            searchValue={data.filters.q}
            searchPlaceholder="Search users, roles, organizations"
            clearHref={pathname}
            hiddenFields={{
              sort: data.filters.sort === "createdAt" ? undefined : data.filters.sort,
              dir: data.filters.dir === "desc" ? undefined : data.filters.dir
            }}
          >
            <select name="verification" defaultValue={data.filters.verification} className={cn(adminSelectClassName, "min-w-40")} aria-label="Filter email verification">
              <option value="all">All verification</option>
              <option value="verified">Verified email</option>
              <option value="pending">Email pending</option>
            </select>
            <select name="access" defaultValue={data.filters.access} className={cn(adminSelectClassName, "min-w-40")} aria-label="Filter access type">
              <option value="all">All access</option>
              <option value="admin">Admin</option>
              <option value="partner">Partner</option>
              <option value="corporate">Corporate</option>
              <option value="basic">Basic / no scope</option>
            </select>
          </AdminListToolbar>

          <AdminDataTable
            caption="User management directory"
            rows={data.users}
            getRowKey={(user) => user.id}
            columns={columns}
            emptyState={<AdminEmptyState title="No matching users" description="Adjust the search term or filters, or create a new user account." />}
          />

          <AdminPagination pathname={pathname} params={baseParams} pagination={data.pagination} />
        </section>

        <form action={createAdminUserAction} className="grid gap-4">
          <HiddenReturn value={returnTo} />
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-coral-100 text-coral-700">
              <UserPlus className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create user</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Create an account, profile, Impact Passport, and initial access, then email a setup link.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name"><input name="name" className={adminInputClassName} required /></Field>
            <Field label="Display name"><input name="displayName" className={adminInputClassName} /></Field>
            <Field label="Email"><input name="email" type="email" className={adminInputClassName} required /></Field>
            <AdminCreateUserAccessFields
              accessOptions={adminCreateUserAccessOptions}
              corporateAccounts={options.corporateAccounts}
              customGlobalRoleOptions={customGlobalRoleOptions.map((role) => ({ label: `${role.name} (${role.key})`, value: `global:${role.key}` }))}
              partnerOrganizations={options.organizations}
              partnerRoleOptions={partnerOrganizationRoles}
            />
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900">
              <input name="isPublic" type="checkbox" className="size-4 accent-coral-500" />
              Public profile
            </label>
            <Field label="Bio" className="md:col-span-2"><textarea name="bio" className={adminTextareaClassName} placeholder="Internal profile note or public bio" /></Field>
          </div>
          <Button type="submit" className="w-fit rounded-lg">Create User</Button>
        </form>

        <section className="grid gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700"><KeyRound className="size-5" aria-hidden="true" /></span>
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Role catalog</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Create custom role records and edit role display names.</p>
            </div>
          </div>
          <form action={createGlobalRoleAction} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <HiddenReturn value={returnTo} />
            <input name="roleKey" placeholder="role_key" className={adminInputClassName} required />
            <input name="roleName" placeholder="Role name" className={adminInputClassName} required />
            <Button type="submit" className="min-h-10 rounded-lg px-3">Save Role</Button>
          </form>
          <div className="grid gap-2">
            {options.roles.map((role) => (
              <div key={role.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-ocean-900">{role.key}</p>
                    <p className="text-xs font-semibold text-ocean-900/52">{role.assignmentCount} assignments · {role.isSystem ? "system role" : "custom role"}</p>
                  </div>
                  {role.isSystem ? <AdminStatusBadge value="active" /> : null}
                </div>
                <form action={updateGlobalRoleAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <HiddenReturn value={returnTo} />
                  <input type="hidden" name="roleId" value={role.id} />
                  <input name="roleName" defaultValue={role.name} className={adminInputClassName} required />
                  <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-3">Rename</Button>
                </form>
                {!role.isSystem ? (
                  <div className="mt-3 rounded-lg border border-coral-700/20 bg-white p-3">
                    <p className="text-xs font-bold text-ocean-900/58">Delete is available only when this custom role has no assignments.</p>
                    <form id={`delete-global-role-${role.id}`} action={deleteGlobalRoleAction}>
                      <HiddenReturn value={returnTo} />
                      <input type="hidden" name="roleId" value={role.id} />
                    </form>
                    <AdminConfirmSubmit
                      formId={`delete-global-role-${role.id}`}
                      title={`Delete ${role.name}?`}
                      body="This permanently removes the custom role from the catalog. Assigned roles must be cleared first."
                      triggerLabel="Delete custom role"
                      submitLabel="Delete role"
                    />
                  </div>
                ) : null}
              </div>
            ))}
            {options.roles.length === 0 ? (
              <AdminEmptyState title="No role records yet" description={`Create or assign ${systemGlobalRoleOptions.map((role) => role.key).join(", ")} to seed the global role catalog.`} />
            ) : null}
          </div>
        </section>
      </FormTabs>

      <section className="grid gap-3 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft md:grid-cols-3">
        <div className="flex gap-3"><LockKeyhole className="mt-1 size-5 text-coral-700" aria-hidden="true" /><p className="text-sm font-semibold leading-6 text-ocean-900/62">Destructive account actions live inside the selected user&apos;s workspace, not the directory.</p></div>
        <div className="flex gap-3"><ShieldCheck className="mt-1 size-5 text-kelp-700" aria-hidden="true" /><p className="text-sm font-semibold leading-6 text-ocean-900/62">The last platform admin remains protected from revoke, password disable, and delete flows.</p></div>
        <div className="flex gap-3"><Mail className="mt-1 size-5 text-ocean-700" aria-hidden="true" /><p className="text-sm font-semibold leading-6 text-ocean-900/62">Partner and corporate access remain scoped to their specific workspaces.</p></div>
      </section>
    </div>
  );
}
