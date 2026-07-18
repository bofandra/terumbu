import {
  BadgeCheck,
  Building2,
  Handshake,
  KeyRound,
  LockKeyhole,
  Mail,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users
} from "lucide-react";
import type { ReactNode } from "react";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName,
  adminTextareaClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import {
  assignGlobalRoleAction,
  clearAdminUserSessionsAction,
  createAdminUserAction,
  createGlobalRoleAction,
  deleteAdminUserAction,
  deleteGlobalRoleAction,
  disableAdminUserPasswordAction,
  removeCorporatePermissionAction,
  removePartnerMembershipAction,
  resetAdminUserPasswordAction,
  revokeGlobalRoleAction,
  setCorporatePermissionAction,
  setPartnerMembershipAction,
  updateAdminUserProfileAction,
  updateGlobalRoleAction,
  updatePartnerMembershipAction
} from "@/lib/admin-user-actions";
import {
  adminCreateUserAccessOptions,
  corporatePermissionOptions,
  isSystemGlobalRole,
  partnerMembershipStatuses,
  systemGlobalRoleOptions
} from "@/lib/admin-user-management";
import { requireRole } from "@/lib/auth";
import { partnerOrganizationRoles } from "@/lib/partner-permissions";
import { getAdminUserManagementData } from "@/lib/queries";

export const metadata = {
  title: "Admin Users"
};

export const dynamic = "force-dynamic";

type AdminUsersPageProps = {
  searchParams?: Promise<{
    error?: string;
    q?: string;
    saved?: string;
  }>;
};

type AdminUserManagementData = Awaited<ReturnType<typeof getAdminUserManagementData>>;
type ManagedUser = AdminUserManagementData["users"][number];

const savedMessages: Record<string, string> = {
  "corporate-removed": "Corporate access removed.",
  "corporate-saved": "Corporate access saved.",
  "global-role-assigned": "Global role assigned.",
  "global-role-revoked": "Global role revoked.",
  "partner-removed": "Partner membership removed.",
  "partner-saved": "Partner membership saved.",
  "password-disabled": "Password login disabled and sessions cleared.",
  "password-reset": "Temporary password saved.",
  "role-deleted": "Role deleted.",
  "role-saved": "Role catalog saved.",
  "sessions-cleared": "User sessions cleared.",
  "user-created": "User account created.",
  "user-deleted": "User account deleted.",
  "user-updated": "User profile saved."
};

const errorMessages: Record<string, string> = {
  "admin-last": "At least one admin account must remain.",
  "admin-self": "You cannot remove or disable your own admin access from this screen.",
  "corporate-invalid": "Choose a valid user, corporate account, and permission.",
  "delete-confirm": "Confirm destructive actions before submitting.",
  "partner-invalid": "Choose a valid user, organization, partner role, and status.",
  "role-assigned": "Remove all assignments before deleting this role.",
  "role-invalid": "Enter a valid role key and role name.",
  "role-missing": "Role assignment was not found.",
  "role-system": "System roles cannot be deleted.",
  "session-self": "You cannot clear your own active admin session here.",
  "user-exists": "Another user already uses that email address.",
  "user-invalid": "Enter a valid name, email, and password where required.",
  "user-missing": "User account was not found."
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Not set";
}

function returnToFor(query: string) {
  return query ? `/admin/users?q=${encodeURIComponent(query)}` : "/admin/users";
}

function HiddenReturn({ value }: { value: string }) {
  return <input type="hidden" name="returnTo" value={value} />;
}

function Field({
  children,
  label,
  className
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm font-bold text-ocean-900 ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}

function AccessSummary({ user }: { user: ManagedUser }) {
  const hasPartnerAccess = user.partnerMemberships.some((membership) => membership.status === "active");
  const hasCorporateAccess = user.corporatePermissions.length > 0;

  return (
    <div className="flex flex-wrap gap-2">
      {user.roles.map((role) => (
        <AdminStatusBadge key={role.id} value={role.key} />
      ))}
      {hasPartnerAccess ? <AdminStatusBadge value="partner" /> : null}
      {hasCorporateAccess ? <AdminStatusBadge value="corporate" /> : null}
      {user.roles.length === 0 && !hasPartnerAccess && !hasCorporateAccess ? <AdminStatusBadge value="basic" /> : null}
    </div>
  );
}

function UserManagementCard({
  data,
  returnTo,
  user
}: {
  data: AdminUserManagementData;
  returnTo: string;
  user: ManagedUser;
}) {
  const displayName = user.displayName ?? user.name ?? user.email;

  return (
    <details className="group rounded-lg border border-ocean-900/10 bg-white shadow-soft">
      <summary className="grid cursor-pointer list-none gap-3 p-4 transition hover:bg-ocean-50/60 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold tracking-normal text-ocean-900">{displayName}</h3>
            {user.emailVerifiedAt ? <BadgeCheck className="size-4 text-kelp-700" aria-hidden="true" /> : null}
            {!user.hasPassword ? <span className="rounded-full bg-coral-100 px-2 py-1 text-xs font-bold text-coral-700">Password disabled</span> : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">{user.email}</p>
          <p className="mt-1 text-xs font-semibold text-ocean-900/42">
            Joined {formatDate(user.createdAt)} · Updated {formatDate(user.updatedAt)} · {user.activeSessions} active sessions
          </p>
        </div>
        <AccessSummary user={user} />
      </summary>

      <div className="grid gap-4 border-t border-ocean-900/10 p-4">
        <section className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
          <h4 className="font-bold text-ocean-900">Profile and account</h4>
          <form action={updateAdminUserProfileAction} className="mt-4 grid gap-3 lg:grid-cols-3">
            <HiddenReturn value={returnTo} />
            <input type="hidden" name="userId" value={user.id} />
            <Field label="Name">
              <input name="name" defaultValue={user.name ?? ""} className={adminInputClassName} required />
            </Field>
            <Field label="Display name">
              <input name="displayName" defaultValue={user.displayName ?? user.name ?? ""} className={adminInputClassName} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={user.email} className={adminInputClassName} required />
            </Field>
            <Field label="Location">
              <input name="location" defaultValue={user.location ?? ""} className={adminInputClassName} />
            </Field>
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900">
              <input name="emailVerified" type="checkbox" defaultChecked={Boolean(user.emailVerifiedAt)} className="size-4 accent-coral-500" />
              Email verified
            </label>
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900">
              <input name="isPublic" type="checkbox" defaultChecked={Boolean(user.isPublic)} className="size-4 accent-coral-500" />
              Public profile
            </label>
            <Field label="Bio" className="lg:col-span-3">
              <textarea name="bio" defaultValue={user.bio ?? ""} className={adminTextareaClassName} />
            </Field>
            <Button type="submit" tone="secondary" className="w-fit rounded-lg lg:col-span-3">
              Save Profile
            </Button>
          </form>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
            <h4 className="font-bold text-ocean-900">Global roles</h4>
            <div className="mt-3 grid gap-2">
              {user.roles.map((role) => (
                <form key={role.id} action={revokeGlobalRoleAction} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                  <HiddenReturn value={returnTo} />
                  <input type="hidden" name="userRoleId" value={role.id} />
                  <span className="text-sm font-bold text-ocean-900">{role.name}</span>
                  <Button type="submit" tone="ghost" className="min-h-9 rounded-lg px-3 text-coral-700 hover:bg-coral-100">
                    Remove
                  </Button>
                </form>
              ))}
              {user.roles.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-sm font-semibold text-ocean-900/58">No global roles assigned.</p> : null}
            </div>
            <form action={assignGlobalRoleAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <HiddenReturn value={returnTo} />
              <input type="hidden" name="userId" value={user.id} />
              <select name="roleKey" defaultValue="user" className={adminSelectClassName}>
                {data.roleOptions.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.name} ({role.key})
                  </option>
                ))}
              </select>
              <Button type="submit" className="min-h-10 rounded-lg px-3">
                Assign
              </Button>
            </form>
          </div>

          <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
            <h4 className="font-bold text-ocean-900">Partner access</h4>
            <div className="mt-3 grid gap-2">
              {user.partnerMemberships.map((membership) => (
                <div key={membership.id} className="rounded-lg bg-white p-3">
                  <p className="font-bold text-ocean-900">{membership.organizationName}</p>
                  <form action={updatePartnerMembershipAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <HiddenReturn value={returnTo} />
                    <input type="hidden" name="membershipId" value={membership.id} />
                    <select name="role" defaultValue={membership.role} className={adminSelectClassName}>
                      {partnerOrganizationRoles.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <select name="status" defaultValue={membership.status} className={adminSelectClassName}>
                      {partnerMembershipStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-3">Save</Button>
                  </form>
                  <form action={removePartnerMembershipAction} className="mt-2">
                    <HiddenReturn value={returnTo} />
                    <input type="hidden" name="membershipId" value={membership.id} />
                    <Button type="submit" tone="ghost" className="min-h-9 rounded-lg px-3 text-coral-700 hover:bg-coral-100">Remove partner access</Button>
                  </form>
                </div>
              ))}
              {user.partnerMemberships.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-sm font-semibold text-ocean-900/58">No partner organization membership.</p> : null}
            </div>
            <form action={setPartnerMembershipAction} className="mt-3 grid gap-2">
              <HiddenReturn value={returnTo} />
              <input type="hidden" name="userId" value={user.id} />
              <select name="organizationId" className={adminSelectClassName} disabled={data.organizations.length === 0}>
                {data.organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} · {organization.verificationLabel}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <select name="role" defaultValue="manager" className={adminSelectClassName}>
                  {partnerOrganizationRoles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <select name="status" defaultValue="active" className={adminSelectClassName}>
                  {partnerMembershipStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <Button type="submit" className="min-h-10 rounded-lg px-3" disabled={data.organizations.length === 0}>
                  Add
                </Button>
              </div>
            </form>
          </div>

          <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
            <h4 className="font-bold text-ocean-900">Corporate access</h4>
            <div className="mt-3 grid gap-2">
              {user.corporatePermissions.map((permission) => (
                <form key={permission.id} action={removeCorporatePermissionAction} className="rounded-lg bg-white p-3">
                  <HiddenReturn value={returnTo} />
                  <input type="hidden" name="permissionId" value={permission.id} />
                  <p className="font-bold text-ocean-900">{permission.accountName}</p>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{permission.permission}</p>
                  <Button type="submit" tone="ghost" className="mt-2 min-h-9 rounded-lg px-3 text-coral-700 hover:bg-coral-100">Remove corporate access</Button>
                </form>
              ))}
              {user.corporatePermissions.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-sm font-semibold text-ocean-900/58">No corporate account access.</p> : null}
            </div>
            <form action={setCorporatePermissionAction} className="mt-3 grid gap-2">
              <HiddenReturn value={returnTo} />
              <input type="hidden" name="userId" value={user.id} />
              <select name="corporateAccountId" className={adminSelectClassName} disabled={data.corporateAccounts.length === 0}>
                {data.corporateAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <select name="permission" defaultValue="executive_viewer" className={adminSelectClassName}>
                  {corporatePermissionOptions.map((permission) => (
                    <option key={permission.value} value={permission.value}>{permission.label}</option>
                  ))}
                </select>
                <Button type="submit" className="min-h-10 rounded-lg px-3" disabled={data.corporateAccounts.length === 0}>
                  Set
                </Button>
              </div>
            </form>
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-coral-700/20 bg-white p-4 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <div>
            <h4 className="font-bold text-ocean-900">Password and sessions</h4>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Reset credentials, force sign-out, or disable password login.</p>
          </div>
          <form action={resetAdminUserPasswordAction} className="grid gap-2">
            <HiddenReturn value={returnTo} />
            <input type="hidden" name="userId" value={user.id} />
            <input name="password" type="password" minLength={8} placeholder="Temporary password" className={adminInputClassName} required />
            <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-3">
              Reset Password
            </Button>
          </form>
          <div className="grid gap-2">
            <form action={clearAdminUserSessionsAction}>
              <HiddenReturn value={returnTo} />
              <input type="hidden" name="userId" value={user.id} />
              <Button type="submit" tone="light" className="min-h-10 w-full rounded-lg px-3">
                Clear Sessions
              </Button>
            </form>
            <form action={disableAdminUserPasswordAction}>
              <HiddenReturn value={returnTo} />
              <input type="hidden" name="userId" value={user.id} />
              <Button type="submit" tone="ghost" className="min-h-10 w-full rounded-lg px-3 text-coral-700 hover:bg-coral-100">
                Disable Password
              </Button>
            </form>
          </div>
          <form action={deleteAdminUserAction} className="grid min-w-48 gap-2">
            <HiddenReturn value={returnTo} />
            <input type="hidden" name="userId" value={user.id} />
            <label className="flex items-start gap-2 text-xs font-bold leading-5 text-ocean-900">
              <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" required />
              Confirm delete
            </label>
            <Button type="submit" tone="ghost" className="min-h-10 rounded-lg px-3 text-coral-700 hover:bg-coral-100">
              Delete User
            </Button>
          </form>
        </section>
      </div>
    </details>
  );
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireRole(["admin"], "/admin/users");
  const params = await searchParams;
  const query = String(params?.q ?? "").trim();
  const returnTo = returnToFor(query);
  const data = await getAdminUserManagementData(query);
  const savedMessage = params?.saved ? savedMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;
  const customGlobalRoleOptions = data.roleOptions.filter((role) => !isSystemGlobalRole(role.key));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Users"
        title="User and role management"
        description="Public registration is closed. Create accounts here, edit profiles, reset credentials, manage global roles, and assign partner or corporate scoped access."
        actionHref="/admin/audit"
        actionLabel="Audit Log"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="User summary">
        {[
          { label: "Users", value: data.metrics.users.toLocaleString("id-ID"), icon: Users },
          { label: "Visible", value: data.metrics.visibleUsers.toLocaleString("id-ID"), icon: Search },
          { label: "Verified", value: data.metrics.verifiedUsers.toLocaleString("id-ID"), icon: BadgeCheck },
          { label: "Admins", value: data.metrics.admins.toLocaleString("id-ID"), icon: ShieldCheck },
          { label: "Partners", value: data.metrics.partnerUsers.toLocaleString("id-ID"), icon: Handshake },
          { label: "Corporate", value: data.metrics.corporateUsers.toLocaleString("id-ID"), icon: Building2 }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-sand-100 text-ocean-900">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <form action={createAdminUserAction} className={`${adminPanelClassName} p-4`}>
          <HiddenReturn value={returnTo} />
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-coral-100 text-coral-700">
              <UserPlus className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create user</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Create a credential account, profile, Impact Passport, and initial access from the RBAC matrix.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <input name="name" className={adminInputClassName} required />
            </Field>
            <Field label="Display name">
              <input name="displayName" className={adminInputClassName} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className={adminInputClassName} required />
            </Field>
            <Field label="Temporary password">
              <input name="password" type="password" minLength={8} className={adminInputClassName} required />
            </Field>
            <Field label="Initial access" className="md:col-span-2">
              <select name="initialAccess" defaultValue="global:user" className={adminSelectClassName}>
                <optgroup label="RBAC matrix roles">
                  {adminCreateUserAccessOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </optgroup>
                {customGlobalRoleOptions.length > 0 ? (
                  <optgroup label="Custom global roles">
                    {customGlobalRoleOptions.map((role) => (
                      <option key={role.key} value={`global:${role.key}`}>
                        {role.name} ({role.key})
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </Field>
            <Field label="Corporate account for corporate access">
              <select name="initialCorporateAccountId" className={adminSelectClassName} disabled={data.corporateAccounts.length === 0}>
                {data.corporateAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Partner organization for partner access">
              <select name="initialPartnerOrganizationId" className={adminSelectClassName} disabled={data.organizations.length === 0}>
                {data.organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} · {organization.verificationLabel}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Partner organization role">
              <select name="initialPartnerRole" defaultValue="manager" className={adminSelectClassName}>
                {partnerOrganizationRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <input name="location" defaultValue="Indonesia" className={adminInputClassName} />
            </Field>
            <input type="hidden" name="initialPartnerStatus" value="active" />
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900">
              <input name="emailVerified" type="checkbox" defaultChecked className="size-4 accent-coral-500" />
              Email verified
            </label>
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900">
              <input name="isPublic" type="checkbox" className="size-4 accent-coral-500" />
              Public profile
            </label>
            <Field label="Bio" className="md:col-span-2">
              <textarea name="bio" className={adminTextareaClassName} placeholder="Internal profile note or public bio" />
            </Field>
          </div>
          <Button type="submit" className="mt-4 rounded-lg">
            Create User
          </Button>
        </form>

        <section className={`${adminPanelClassName} p-4`}>
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Role catalog</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Create custom role records and edit role display names.</p>
            </div>
          </div>
          <form action={createGlobalRoleAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <HiddenReturn value={returnTo} />
            <input name="roleKey" placeholder="role_key" className={adminInputClassName} required />
            <input name="roleName" placeholder="Role name" className={adminInputClassName} required />
            <Button type="submit" className="min-h-10 rounded-lg px-3">Save Role</Button>
          </form>
          <div className="mt-4 grid gap-2">
            {data.roles.map((role) => (
              <div key={role.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-ocean-900">{role.key}</p>
                    <p className="text-xs font-semibold text-ocean-900/52">
                      {role.assignmentCount} assignments · {role.isSystem ? "system role" : "custom role"}
                    </p>
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
                  <form action={deleteGlobalRoleAction} className="mt-2 flex flex-wrap items-center gap-2">
                    <HiddenReturn value={returnTo} />
                    <input type="hidden" name="roleId" value={role.id} />
                    <label className="flex items-center gap-2 text-xs font-bold text-ocean-900">
                      <input name="confirmDelete" type="checkbox" value="delete" className="size-4 accent-coral-500" required />
                      Confirm
                    </label>
                    <Button type="submit" tone="ghost" className="min-h-9 rounded-lg px-3 text-coral-700 hover:bg-coral-100">
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete
                    </Button>
                  </form>
                ) : null}
              </div>
            ))}
            {data.roles.length === 0 ? (
              <AdminEmptyState
                title="No role records yet"
                description={`Create or assign ${systemGlobalRoleOptions.map((role) => role.key).join(", ")} to seed the global role catalog.`}
              />
            ) : null}
          </div>
        </section>
      </section>

      <section className={adminPanelClassName}>
        <div className="grid gap-4 border-b border-ocean-900/10 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Managed users</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Open a user row to manage profile, credentials, global roles, partner membership, and corporate access.</p>
          </div>
          <form action="/admin/users" className="flex gap-2">
            <div className="relative min-w-0 flex-1 sm:min-w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ocean-900/42" aria-hidden="true" />
              <input name="q" defaultValue={query} placeholder="Search users, roles, organizations" className={`${adminInputClassName} w-full pl-9`} />
            </div>
            <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-3">Search</Button>
          </form>
        </div>
        <div className="grid gap-3 p-4">
          {data.users.map((user) => (
            <UserManagementCard key={user.id} data={data} user={user} returnTo={returnTo} />
          ))}
          {data.users.length === 0 ? (
            <AdminEmptyState
              title="No matching users"
              description="Adjust the search term or create a new user account from the form above."
            />
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft md:grid-cols-3">
        <div className="flex gap-3">
          <LockKeyhole className="mt-1 size-5 text-coral-700" aria-hidden="true" />
          <p className="text-sm font-semibold leading-6 text-ocean-900/62">Deleting a user cascades through owned account rows. Use it only when the account must be removed from the platform.</p>
        </div>
        <div className="flex gap-3">
          <ShieldCheck className="mt-1 size-5 text-kelp-700" aria-hidden="true" />
          <p className="text-sm font-semibold leading-6 text-ocean-900/62">The last platform admin is protected from revoke, password disable, and delete flows.</p>
        </div>
        <div className="flex gap-3">
          <Mail className="mt-1 size-5 text-ocean-700" aria-hidden="true" />
          <p className="text-sm font-semibold leading-6 text-ocean-900/62">Partner and corporate access are scoped; global roles remain visible separately for auth routing and audits.</p>
        </div>
      </section>
    </div>
  );
}
