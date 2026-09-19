import type { ReactNode } from "react";

import { AdminConfirmSubmit } from "@/components/admin/admin-confirm-submit";
import { AdminStatusBadge, adminInputClassName, adminSelectClassName, adminTextareaClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import {
  assignGlobalRoleAction,
  clearAdminUserSessionsAction,
  deleteAdminUserAction,
  disableAdminUserPasswordAction,
  removeCorporatePermissionAction,
  removePartnerMembershipAction,
  resendAdminUserSetupVerificationAction,
  resetAdminUserPasswordAction,
  revokeGlobalRoleAction,
  setCorporatePermissionAction,
  setPartnerMembershipAction,
  updateAdminUserProfileAction,
  updatePartnerMembershipAction
} from "@/lib/admin-user-actions";
import { partnerMembershipStatuses } from "@/lib/admin-user-management";
import { partnerOrganizationRoles } from "@/lib/partner-permissions";
import type { getAdminUserWorkspaceData } from "@/lib/queries";

type AdminUserWorkspaceData = Awaited<ReturnType<typeof getAdminUserWorkspaceData>>;
type ManagedUser = NonNullable<AdminUserWorkspaceData["user"]>;

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

export function AdminUserWorkspace({
  data,
  user,
  returnTo,
  deleteReturnTo
}: {
  data: AdminUserWorkspaceData;
  user: ManagedUser;
  returnTo: string;
  deleteReturnTo: string;
}) {
  const displayName = user.displayName ?? user.name ?? user.email;

  return (
    <FormTabs
      ariaLabel={`Manage ${displayName}`}
      tabs={[
        { id: "profile", label: "Profile", description: "Identity and public page" },
        { id: "roles", label: "Roles", description: "Global RBAC", badge: user.roles.length.toLocaleString("id-ID") },
        { id: "partner", label: "Partner", description: "Organization access", badge: user.partnerMemberships.length.toLocaleString("id-ID") },
        { id: "corporate", label: "Corporate", description: "Workspace access", badge: user.corporatePermissions.length.toLocaleString("id-ID") },
        { id: "security", label: "Security", description: "Email, password, sessions" },
        { id: "danger", label: "Danger", description: "Delete account" }
      ]}
    >
      <section className="grid gap-4">
        <h2 className="text-lg font-bold text-ocean-900">Profile and account</h2>
        <form action={updateAdminUserProfileAction} className="grid gap-3 lg:grid-cols-3">
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

      <section className="grid gap-4">
        <div>
          <h2 className="text-lg font-bold text-ocean-900">Global roles</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Assign or revoke platform-wide access roles for this user.</p>
          <div className="mt-3 grid gap-2">
            {user.roles.map((role) => (
              <form key={role.id} action={revokeGlobalRoleAction} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                <HiddenReturn value={returnTo} />
                <input type="hidden" name="userRoleId" value={role.id} />
                <div>
                  <span className="text-sm font-bold text-ocean-900">{role.name}</span>
                  <span className="ml-2 text-xs font-semibold text-ocean-900/48">{role.key}</span>
                </div>
                <Button type="submit" tone="ghost" className="min-h-9 rounded-lg px-3 text-coral-700 hover:bg-coral-100">
                  Remove
                </Button>
              </form>
            ))}
            {user.roles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-sm font-semibold text-ocean-900/58">No global roles assigned.</p>
            ) : null}
          </div>
          <form action={assignGlobalRoleAction} className="mt-3 grid gap-2 sm:max-w-xl sm:grid-cols-[1fr_auto]">
            <HiddenReturn value={returnTo} />
            <input type="hidden" name="userId" value={user.id} />
            <select name="roleKey" defaultValue="user" className={adminSelectClassName}>
              {data.roleOptions.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name} ({role.key})
                </option>
              ))}
            </select>
            <Button type="submit" className="min-h-10 rounded-lg px-3">Assign</Button>
          </form>
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-lg font-bold text-ocean-900">Partner access</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Manage partner organization membership and partner portal status.</p>
          <div className="mt-3 grid gap-2">
            {user.partnerMemberships.map((membership) => (
              <div key={membership.id} className="rounded-lg border border-ocean-900/10 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-ocean-900">{membership.organizationName}</p>
                  <AdminStatusBadge value={membership.status} />
                </div>
                <form action={updatePartnerMembershipAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <HiddenReturn value={returnTo} />
                  <input type="hidden" name="membershipId" value={membership.id} />
                  <select name="role" defaultValue={membership.role} className={adminSelectClassName}>
                    {partnerOrganizationRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <select name="status" defaultValue={membership.status} className={adminSelectClassName}>
                    {partnerMembershipStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-3">Save</Button>
                </form>
                <details className="mt-3 rounded-lg border border-coral-700/20 bg-coral-100/30">
                  <summary className="cursor-pointer list-none px-3 py-2 text-sm font-bold text-coral-700">Remove partner access</summary>
                  <form action={removePartnerMembershipAction} className="border-t border-coral-700/20 p-3">
                    <HiddenReturn value={returnTo} />
                    <input type="hidden" name="membershipId" value={membership.id} />
                    <Button type="submit" tone="ghost" className="min-h-9 rounded-lg px-3 text-coral-700 hover:bg-coral-100">Remove partner access</Button>
                  </form>
                </details>
              </div>
            ))}
            {user.partnerMemberships.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-sm font-semibold text-ocean-900/58">No partner organization membership.</p>
            ) : null}
          </div>
          <form action={setPartnerMembershipAction} className="mt-3 grid gap-2 sm:max-w-2xl">
            <HiddenReturn value={returnTo} />
            <input type="hidden" name="userId" value={user.id} />
            <select name="organizationId" className={adminSelectClassName} disabled={data.organizations.length === 0}>
              {data.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name} · {organization.verificationLabel}</option>
              ))}
            </select>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select name="role" defaultValue="manager" className={adminSelectClassName}>
                {partnerOrganizationRoles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <select name="status" defaultValue="active" className={adminSelectClassName}>
                {partnerMembershipStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <Button type="submit" className="min-h-10 rounded-lg px-3" disabled={data.organizations.length === 0}>Add</Button>
            </div>
          </form>
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-lg font-bold text-ocean-900">Corporate access</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Grant or remove corporate workspace access.</p>
          <div className="mt-3 grid gap-2">
            {user.corporatePermissions.map((permission) => (
              <form key={permission.id} action={removeCorporatePermissionAction} className="rounded-lg border border-ocean-900/10 bg-white p-3">
                <HiddenReturn value={returnTo} />
                <input type="hidden" name="permissionId" value={permission.id} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-ocean-900">{permission.accountName}</p>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">{permission.permission}</p>
                  </div>
                  <Button type="submit" tone="ghost" className="min-h-9 rounded-lg px-3 text-coral-700 hover:bg-coral-100">Remove access</Button>
                </div>
              </form>
            ))}
            {user.corporatePermissions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-sm font-semibold text-ocean-900/58">No corporate account access.</p>
            ) : null}
          </div>
          <form action={setCorporatePermissionAction} className="mt-3 grid gap-2 sm:max-w-2xl">
            <HiddenReturn value={returnTo} />
            <input type="hidden" name="userId" value={user.id} />
            <select name="corporateAccountId" className={adminSelectClassName} disabled={data.corporateAccounts.length === 0}>
              {data.corporateAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
            <Button type="submit" className="min-h-10 w-fit rounded-lg px-3" disabled={data.corporateAccounts.length === 0}>Grant Access</Button>
          </form>
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-lg font-bold text-ocean-900">Password and sessions</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Send setup or reset links, force sign-out, or disable password login.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <form action={resetAdminUserPasswordAction}>
            <HiddenReturn value={returnTo} />
            <input type="hidden" name="userId" value={user.id} />
            <Button type="submit" tone="secondary" className="min-h-10 w-full rounded-lg px-3">Send Reset Link</Button>
          </form>
          {!user.emailVerifiedAt ? (
            <form action={resendAdminUserSetupVerificationAction}>
              <HiddenReturn value={returnTo} />
              <input type="hidden" name="userId" value={user.id} />
              <Button type="submit" tone="light" className="min-h-10 w-full rounded-lg px-3">{user.hasPassword ? "Resend Verification" : "Resend Setup"}</Button>
            </form>
          ) : null}
          <form action={clearAdminUserSessionsAction}>
            <HiddenReturn value={returnTo} />
            <input type="hidden" name="userId" value={user.id} />
            <Button type="submit" tone="light" className="min-h-10 w-full rounded-lg px-3">Clear Sessions ({user.activeSessions})</Button>
          </form>
          <form action={disableAdminUserPasswordAction}>
            <HiddenReturn value={returnTo} />
            <input type="hidden" name="userId" value={user.id} />
            <Button type="submit" tone="ghost" className="min-h-10 w-full rounded-lg px-3 text-coral-700 hover:bg-coral-100">Disable Password</Button>
          </form>
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-lg font-bold text-ocean-900">Delete user</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Deleting this account cascades through owned account rows and cannot be undone from the admin portal.</p>
        </div>
        <form id={`delete-admin-user-${user.id}`} action={deleteAdminUserAction}>
          <HiddenReturn value={deleteReturnTo} />
          <input type="hidden" name="userId" value={user.id} />
        </form>
        <AdminConfirmSubmit
          formId={`delete-admin-user-${user.id}`}
          title={`Delete ${displayName}?`}
          body={`This permanently removes ${user.email} and account-owned rows. This action cannot be undone from this screen.`}
          triggerLabel="Delete user"
          submitLabel="Delete user permanently"
        />
      </section>
    </FormTabs>
  );
}
