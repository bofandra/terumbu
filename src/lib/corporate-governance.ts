export const corporateIntegrationTypes = ["sso", "hr_system", "finance_ledger", "esg_reporting", "webhook", "storage", "other"] as const;
export const corporateIntegrationStatuses = ["not_configured", "configured", "connected", "error", "disabled"] as const;

export type CorporateIntegrationType = (typeof corporateIntegrationTypes)[number];
export type CorporateIntegrationStatus = (typeof corporateIntegrationStatuses)[number];

export type CorporateSecuritySettingsInput = {
  id?: string | null;
  mfaRequired: boolean;
  exportLoggingEnabled: boolean;
  sessionHistoryEnabled: boolean;
  retentionPolicyDays: number | null;
  domainRestrictionEnabled: boolean;
  allowedEmailDomains: string | null;
  updatedAt?: Date | null;
};

export function normalizeCorporateIntegrationType(value: string): CorporateIntegrationType {
  return corporateIntegrationTypes.includes(value as CorporateIntegrationType) ? (value as CorporateIntegrationType) : "other";
}

export function normalizeCorporateIntegrationStatus(value: string): CorporateIntegrationStatus {
  return corporateIntegrationStatuses.includes(value as CorporateIntegrationStatus) ? (value as CorporateIntegrationStatus) : "not_configured";
}

export function splitAllowedEmailDomains(value: string | null | undefined) {
  return String(value ?? "")
    .split(/[\n,]+/)
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export function configuredIntegrationCount(integrations: Array<{ rawStatus?: string; status?: string }>) {
  return integrations.filter((item) => ["configured", "connected"].includes(item.rawStatus ?? item.status ?? "")).length;
}

export function buildCorporateSecurityChecklist(settings: CorporateSecuritySettingsInput) {
  const allowedEmailDomains = splitAllowedEmailDomains(settings.allowedEmailDomains);

  return [
    {
      key: "mfa",
      label: "MFA enforcement",
      status: settings.mfaRequired ? "configured" : "ready_to_configure",
      description: settings.mfaRequired ? "Corporate users are expected to use MFA." : "Enable MFA expectation for corporate users."
    },
    {
      key: "export_logging",
      label: "Export logging",
      status: settings.exportLoggingEnabled ? "allowed" : "ready_to_configure",
      description: settings.exportLoggingEnabled ? "Report/export actions are included in the audit timeline." : "Turn on export logging for governance visibility."
    },
    {
      key: "session_history",
      label: "Session history",
      status: settings.sessionHistoryEnabled ? "configured" : "ready_to_configure",
      description: settings.sessionHistoryEnabled ? "Workspace expects session activity history." : "Configure session history expectations."
    },
    {
      key: "retention_policy",
      label: "Retention policy",
      status: settings.retentionPolicyDays ? "configured" : "ready_to_configure",
      description: settings.retentionPolicyDays ? `${settings.retentionPolicyDays} day retention policy configured.` : "Set a retention period for reports and evidence artifacts."
    },
    {
      key: "domain_restrictions",
      label: "Domain restrictions",
      status: settings.domainRestrictionEnabled && allowedEmailDomains.length > 0 ? "configured" : "ready_to_configure",
      description:
        settings.domainRestrictionEnabled && allowedEmailDomains.length > 0
          ? `Allowed domains: ${allowedEmailDomains.join(", ")}`
          : "Add allowed email domains for corporate invitations."
    }
  ];
}
