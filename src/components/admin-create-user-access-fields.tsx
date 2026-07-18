"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import {
  adminInputClassName,
  adminSelectClassName
} from "@/components/admin-ui";

type AccessOption = {
  label: string;
  value: string;
};

type CorporateAccountOption = {
  id: string;
  name: string;
};

type PartnerOrganizationOption = {
  id: string;
  name: string;
  verificationLabel: string;
};

function Field({
  children,
  className,
  label
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`grid gap-2 text-sm font-bold text-ocean-900 ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}

export function AdminCreateUserAccessFields({
  accessOptions,
  corporateAccounts,
  customGlobalRoleOptions,
  partnerOrganizations,
  partnerRoleOptions
}: {
  accessOptions: readonly AccessOption[];
  corporateAccounts: CorporateAccountOption[];
  customGlobalRoleOptions: AccessOption[];
  partnerOrganizations: PartnerOrganizationOption[];
  partnerRoleOptions: readonly string[];
}) {
  const [access, setAccess] = useState("global:user");
  const showCorporateFields = access.startsWith("corporate:");
  const showPartnerFields = access === "partner";

  return (
    <>
      <Field label="Initial access" className="md:col-span-2">
        <select name="initialAccess" value={access} onChange={(event) => setAccess(event.target.value)} className={adminSelectClassName}>
          <optgroup label="RBAC matrix roles">
            {accessOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </optgroup>
          {customGlobalRoleOptions.length > 0 ? (
            <optgroup label="Custom global roles">
              {customGlobalRoleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </Field>

      {showCorporateFields ? (
        <Field label="Corporate account for corporate admin" className="md:col-span-2">
          <select name="initialCorporateAccountId" className={adminSelectClassName} disabled={corporateAccounts.length === 0} required>
            {corporateAccounts.length > 0 ? (
              corporateAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))
            ) : (
              <option value="">No corporate accounts available</option>
            )}
          </select>
        </Field>
      ) : null}

      {showPartnerFields ? (
        <>
          <Field label="Partner organization" className="md:col-span-2">
            <select name="initialPartnerOrganizationId" className={adminSelectClassName} disabled={partnerOrganizations.length === 0} required>
              {partnerOrganizations.length > 0 ? (
                partnerOrganizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} - {organization.verificationLabel}
                  </option>
                ))
              ) : (
                <option value="">No partner organizations available</option>
              )}
            </select>
          </Field>
          <Field label="Partner organization role">
            <select name="initialPartnerRole" defaultValue="manager" className={adminSelectClassName}>
              {partnerRoleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </Field>
          <input type="hidden" name="initialPartnerStatus" value="active" />
        </>
      ) : null}

      <Field label="Location">
        <input name="location" defaultValue="Indonesia" className={adminInputClassName} />
      </Field>
    </>
  );
}
