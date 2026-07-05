export const corporateProgramStatuses = ["draft", "active", "paused", "completed", "archived"] as const;
export type CorporateProgramStatus = (typeof corporateProgramStatuses)[number];

export function normalizeCorporateProgramStatus(value: string | null | undefined): CorporateProgramStatus {
  return corporateProgramStatuses.includes(value as CorporateProgramStatus) ? (value as CorporateProgramStatus) : "active";
}

export function corporateEvidenceVisibilityForStatus(status: string | null | undefined) {
  return status === "verified" ? "reportable" : "internal";
}

export function shouldLinkEvidenceToCorporateProgram(status: string | null | undefined) {
  return status === "verified";
}

export function canAcceptCorporateEmployeeInvite(input: {
  inviteEmail: string;
  userEmail: string;
  inviteStatus: string;
  expiresAt: Date;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const inviteEmail = input.inviteEmail.trim().toLowerCase();
  const userEmail = input.userEmail.trim().toLowerCase();

  if (input.inviteStatus !== "pending") {
    return { ok: false, reason: "already-used" as const };
  }

  if (input.expiresAt.getTime() < now.getTime()) {
    return { ok: false, reason: "expired" as const };
  }

  if (inviteEmail !== userEmail) {
    return { ok: false, reason: "email-mismatch" as const };
  }

  return { ok: true, reason: null };
}

export function corporateInviteExpiresAt(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt;
}
