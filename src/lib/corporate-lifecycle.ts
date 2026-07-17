export const corporateProgramStatuses = ["draft", "active", "paused", "completed", "archived"] as const;
export type CorporateProgramStatus = (typeof corporateProgramStatuses)[number];

export const corporateEmployeeEventStatuses = ["draft", "registration_open", "waitlist", "closed", "completed", "cancelled"] as const;
export type CorporateEmployeeEventStatus = (typeof corporateEmployeeEventStatuses)[number];

export const corporateEmployeeEventTypes = ["volunteer", "training", "challenge", "fundraiser"] as const;
export type CorporateEmployeeEventType = (typeof corporateEmployeeEventTypes)[number];

export const corporateEventRegistrationStatuses = ["registered", "waitlisted", "attended", "cancelled", "no_show"] as const;
export type CorporateEventRegistrationStatus = (typeof corporateEventRegistrationStatuses)[number];

export function normalizeCorporateProgramStatus(value: string | null | undefined): CorporateProgramStatus {
  return corporateProgramStatuses.includes(value as CorporateProgramStatus) ? (value as CorporateProgramStatus) : "active";
}

export function normalizeCorporateEmployeeEventStatus(value: string | null | undefined): CorporateEmployeeEventStatus {
  return corporateEmployeeEventStatuses.includes(value as CorporateEmployeeEventStatus) ? (value as CorporateEmployeeEventStatus) : "draft";
}

export function normalizeCorporateEmployeeEventType(value: string | null | undefined): CorporateEmployeeEventType {
  return corporateEmployeeEventTypes.includes(value as CorporateEmployeeEventType) ? (value as CorporateEmployeeEventType) : "volunteer";
}

export function normalizeCorporateEventRegistrationStatus(value: string | null | undefined): CorporateEventRegistrationStatus {
  return corporateEventRegistrationStatuses.includes(value as CorporateEventRegistrationStatus)
    ? (value as CorporateEventRegistrationStatus)
    : "registered";
}

export function corporateEventRegistrationAvailability(input: {
  status: string | null | undefined;
  capacity: number;
  registeredCount: number;
  waitlistEnabled: boolean;
}) {
  const status = normalizeCorporateEmployeeEventStatus(input.status);
  const capacity = Math.max(0, Math.floor(input.capacity));
  const registeredCount = Math.max(0, Math.floor(input.registeredCount));
  const availableSeats = Math.max(0, capacity - registeredCount);

  if (["cancelled", "completed", "closed", "draft"].includes(status)) {
    return {
      code: status,
      label: status.replaceAll("_", " "),
      canRegister: false,
      willWaitlist: false,
      availableSeats
    };
  }

  if (status === "waitlist") {
    return {
      code: input.waitlistEnabled ? "waitlist" : "full",
      label: input.waitlistEnabled ? "Waitlist open" : "Full",
      canRegister: input.waitlistEnabled,
      willWaitlist: input.waitlistEnabled,
      availableSeats
    };
  }

  if (availableSeats > 0) {
    return {
      code: "available",
      label: `${availableSeats} seats available`,
      canRegister: true,
      willWaitlist: false,
      availableSeats
    };
  }

  if (input.waitlistEnabled) {
    return {
      code: "waitlist",
      label: "Waitlist open",
      canRegister: true,
      willWaitlist: true,
      availableSeats
    };
  }

  return {
    code: "full",
    label: "Full",
    canRegister: false,
    willWaitlist: false,
    availableSeats
  };
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
