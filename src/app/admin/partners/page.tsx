import { BadgeCheck, Globe2, Handshake, Plus, Save, Trash2, UserPlus, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import {
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName,
  adminTextareaClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import {
  addOrganizationUserAction,
  createOrganizationAction,
  createOrganizationUserAction,
  deleteOrganizationAction,
  removeOrganizationUserAction,
  updateOrganizationAction,
  updateOrganizationUserAction
} from "@/lib/portal-actions";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Partners"
};

export const dynamic = "force-dynamic";

const verificationLevels = ["basic", "document", "field"];
const organizationTypes = ["ngo", "community_cooperative", "community_group", "corporate_partner", "government", "research"];
const partnerUserRoles = ["owner", "manager", "contributor", "viewer"];
const partnerUserStatuses = ["active", "inactive"];

const statusMessages: Record<string, string> = {
  "partner-created": "Partner created.",
  "partner-updated": "Partner updated.",
  "partner-deleted": "Partner deleted.",
  "partner-user-assigned": "User assigned to partner.",
  "partner-user-created": "Partner user created.",
  "partner-user-updated": "Partner user updated.",
  "partner-user-removed": "Partner user removed."
};

const errorMessages: Record<string, string> = {
  "partner-delete": "Confirm deletion by checking the delete box.",
  "partner-has-campaigns": "Partners with campaigns cannot be deleted.",
  "partner-invalid": "Enter a partner name, slug, and type.",
  "partner-slug": "That partner slug is already in use.",
  "partner-user-exists": "That email already belongs to a user. Use assign existing user instead.",
  "partner-user-invalid": "Enter valid user details. New passwords must be at least 8 characters.",
  "partner-user-missing": "No user exists for that email.",
  "partner-missing": "Partner record was not found."
};

type AdminPartnersPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-ocean-900 ${className}`}>
      {label}
      {children}
    </label>
  );
}

export default async function AdminPartnersPage({ searchParams }: AdminPartnersPageProps) {
  await requireRole(["admin"], "/admin/partners");
  const params = await searchParams;
  const data = await getAdminOperationsData();

  const fieldVerified = data.partners.filter((partner) => partner.verification === "field").length;
  const documentVerified = data.partners.filter((partner) => partner.verification === "document").length;
  const activePartnerUsers = data.partners.reduce((total, partner) => total + partner.members.filter((member) => member.status === "active").length, 0);
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Partners"
        title="Partner management"
        description="Create partner organizations, maintain public trust details, and control which users can operate each partner workspace."
        actionHref="/admin"
        actionLabel="Overview"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Partner summary">
        {[
          { label: "Partners", value: data.partners.length.toLocaleString("id-ID"), icon: Handshake },
          { label: "Document verified", value: documentVerified.toLocaleString("id-ID"), icon: BadgeCheck },
          { label: "Field verified", value: fieldVerified.toLocaleString("id-ID"), icon: Globe2 },
          { label: "Active partner users", value: activePartnerUsers.toLocaleString("id-ID"), icon: UsersRound }
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

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create partner</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">New partners start with a trust level and can receive team users immediately after creation.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form action={createOrganizationAction} className="grid gap-4 p-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Name" className="lg:col-span-2">
              <input name="name" placeholder="Yayasan Laut Baru" className={adminInputClassName} required />
            </Field>
            <Field label="Slug">
              <input name="slug" placeholder="yayasan-laut-baru" className={adminInputClassName} />
            </Field>
            <Field label="Type">
              <select name="type" defaultValue="ngo" className={adminSelectClassName}>
                {organizationTypes.map((type) => (
                  <option key={type} value={type}>
                    {labelize(type)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Website URL">
              <input name="websiteUrl" type="url" placeholder="https://..." className={adminInputClassName} />
            </Field>
            <Field label="Logo URL">
              <input name="logoUrl" type="url" placeholder="https://..." className={adminInputClassName} />
            </Field>
            <Field label="Verification">
              <select name="verification" defaultValue="basic" className={adminSelectClassName}>
                {verificationLevels.map((verification) => (
                  <option key={verification} value={verification}>
                    {verification}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea name="description" placeholder="Public partner profile summary" className={adminTextareaClassName} />
          </Field>
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Plus className="size-4" aria-hidden="true" />
            Create Partner
          </Button>
        </form>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Partner directory</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Edit organization records and manage partner users.</p>
          </div>
          <Handshake className="size-5 text-coral-700" aria-hidden="true" />
        </div>

        <div className="divide-y divide-ocean-900/10">
          {data.partners.map((partner) => (
            <article key={partner.id} className="p-4">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold tracking-normal text-ocean-900">{partner.name}</h3>
                    <AdminStatusBadge value={partner.verification} />
                    <AdminStatusBadge value={partner.type} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {partner.slug} / {partner.campaignCount.toLocaleString("id-ID")} campaigns / {partner.members.length.toLocaleString("id-ID")} users
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
                  <h4 className="font-bold text-ocean-900">Organization details</h4>
                  <form action={updateOrganizationAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="organizationId" value={partner.id} />
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Field label="Name">
                        <input name="name" defaultValue={partner.name} className={adminInputClassName} required />
                      </Field>
                      <Field label="Slug">
                        <input name="slug" defaultValue={partner.slug} className={adminInputClassName} required />
                      </Field>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Field label="Type">
                        <select name="type" defaultValue={partner.type} className={adminSelectClassName}>
                          {organizationTypes.map((type) => (
                            <option key={type} value={type}>
                              {labelize(type)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Verification">
                        <select name="verification" defaultValue={partner.verification} className={adminSelectClassName}>
                          {verificationLevels.map((verification) => (
                            <option key={verification} value={verification}>
                              {verification}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Field label="Website URL">
                        <input name="websiteUrl" type="url" defaultValue={partner.websiteUrl ?? ""} className={adminInputClassName} />
                      </Field>
                      <Field label="Logo URL">
                        <input name="logoUrl" type="url" defaultValue={partner.logoUrl ?? ""} className={adminInputClassName} />
                      </Field>
                    </div>
                    <Field label="Description">
                      <textarea name="description" defaultValue={partner.description ?? ""} className={adminTextareaClassName} />
                    </Field>
                    <Button type="submit" tone="secondary" className="w-fit rounded-lg">
                      <Save className="size-4" aria-hidden="true" />
                      Save Partner
                    </Button>
                  </form>

                  <form action={deleteOrganizationAction} className="mt-4 rounded-lg border border-coral-700/20 bg-white p-3">
                    <input type="hidden" name="organizationId" value={partner.id} />
                    <label className="flex items-start gap-2 text-sm font-bold text-ocean-900">
                      <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" disabled={partner.campaignCount > 0} required />
                      Delete this partner. Partners with campaigns must be emptied before deletion.
                    </label>
                    <Button type="submit" className="mt-3 w-fit rounded-lg bg-coral-500 hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-45" disabled={partner.campaignCount > 0}>
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete Partner
                    </Button>
                  </form>
                </div>

                <div className="rounded-lg border border-ocean-900/10 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-ocean-900">Partner users</h4>
                      <p className="mt-1 text-sm font-semibold text-ocean-900/58">Active users receive partner portal access for this organization.</p>
                    </div>
                    <UsersRound className="size-5 text-kelp-700" aria-hidden="true" />
                  </div>

                  <div className="mt-4 grid gap-3">
                    {partner.members.map((member) => (
                      <div key={member.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-ocean-900">{member.displayName ?? member.name ?? member.email}</p>
                            <p className="text-sm font-semibold text-ocean-900/58">{member.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <AdminStatusBadge value={member.role} />
                            <AdminStatusBadge value={member.status} />
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <form action={updateOrganizationUserAction} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <input type="hidden" name="organizationUserId" value={member.id} />
                            <select name="role" defaultValue={member.role} className={adminSelectClassName}>
                              {partnerUserRoles.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                            <select name="status" defaultValue={member.status} className={adminSelectClassName}>
                              {partnerUserStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-3">
                              <Save className="size-4" aria-hidden="true" />
                              Save
                            </Button>
                          </form>
                          <form action={removeOrganizationUserAction}>
                            <input type="hidden" name="organizationUserId" value={member.id} />
                            <Button type="submit" tone="ghost" className="min-h-10 rounded-lg px-3 text-coral-700 hover:bg-coral-100">
                              <Trash2 className="size-4" aria-hidden="true" />
                              Remove
                            </Button>
                          </form>
                        </div>
                      </div>
                    ))}
                    {partner.members.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-sm font-semibold text-ocean-900/58">No partner users assigned.</p> : null}
                  </div>

                  <div className="mt-4 grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
                    <h5 className="font-bold text-ocean-900">Assign existing user</h5>
                    <form action={addOrganizationUserAction} className="grid gap-2">
                      <input type="hidden" name="organizationId" value={partner.id} />
                      <input name="email" type="email" placeholder="user@example.com" className={adminInputClassName} required />
                      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <select name="role" defaultValue="manager" className={adminSelectClassName}>
                          {partnerUserRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <select name="status" defaultValue="active" className={adminSelectClassName}>
                          {partnerUserStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-3">
                          <UserPlus className="size-4" aria-hidden="true" />
                          Assign
                        </Button>
                      </div>
                    </form>
                  </div>

                  <div className="mt-3 grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
                    <h5 className="font-bold text-ocean-900">Create new partner user</h5>
                    <form action={createOrganizationUserAction} className="grid gap-2">
                      <input type="hidden" name="organizationId" value={partner.id} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input name="name" placeholder="Name" className={adminInputClassName} required />
                        <input name="email" type="email" placeholder="user@example.com" className={adminInputClassName} required />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                        <input name="password" type="password" minLength={8} placeholder="Temporary password" className={adminInputClassName} required />
                        <select name="role" defaultValue="manager" className={adminSelectClassName}>
                          {partnerUserRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <select name="status" defaultValue="active" className={adminSelectClassName}>
                          {partnerUserStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" className="min-h-10 rounded-lg px-3">
                          <UserPlus className="size-4" aria-hidden="true" />
                          Create
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {data.partners.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/58">No partners found.</p> : null}
        </div>
      </section>
    </div>
  );
}
