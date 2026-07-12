import { createHash } from "node:crypto";

export const passportVisibilityOptions = ["private", "link", "public"] as const;

export type PassportVisibility = (typeof passportVisibilityOptions)[number];

export const passportEvidenceConsentOptions = ["show_evidence", "hide_evidence"] as const;

export type PassportEvidenceConsent = (typeof passportEvidenceConsentOptions)[number];

export const passportShareCategories = [
  { key: "donation", label: "Donations" },
  { key: "ecosystem", label: "Ecosystems" },
  { key: "expedition", label: "Field activities" },
  { key: "certificate", label: "Certificates" },
  { key: "badge", label: "Badges" },
  { key: "volunteer", label: "Volunteer hours" },
  { key: "other", label: "Other records" }
] as const;

export type PassportShareCategory = (typeof passportShareCategories)[number]["key"];
export type PassportCategoryVisibility = Record<PassportShareCategory, boolean>;

export const defaultPassportCategoryVisibility: PassportCategoryVisibility = passportShareCategories.reduce(
  (visibility, category) => ({
    ...visibility,
    [category.key]: true
  }),
  {} as PassportCategoryVisibility
);

export function normalizePassportVisibility(value: unknown): PassportVisibility {
  return passportVisibilityOptions.includes(value as PassportVisibility) ? (value as PassportVisibility) : "private";
}

export function normalizePassportEvidenceConsent(value: unknown): PassportEvidenceConsent {
  return passportEvidenceConsentOptions.includes(value as PassportEvidenceConsent) ? (value as PassportEvidenceConsent) : "show_evidence";
}

export function normalizePassportCategoryVisibility(value: unknown): PassportCategoryVisibility {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...defaultPassportCategoryVisibility };
  }

  return passportShareCategories.reduce((visibility, category) => {
    const rawValue = (value as Record<string, unknown>)[category.key];

    visibility[category.key] = typeof rawValue === "boolean" ? rawValue : defaultPassportCategoryVisibility[category.key];

    return visibility;
  }, {} as PassportCategoryVisibility);
}

export function passportItemCategory(itemType: string): PassportShareCategory {
  if (itemType === "donation") {
    return "donation";
  }

  if (["ecosystem", "coral", "restoration"].includes(itemType)) {
    return "ecosystem";
  }

  if (["expedition", "field_activity", "trip"].includes(itemType)) {
    return "expedition";
  }

  if (itemType === "certificate") {
    return "certificate";
  }

  if (itemType === "badge") {
    return "badge";
  }

  if (itemType === "volunteer") {
    return "volunteer";
  }

  return "other";
}

export function passportItemIsVisible(itemType: string, categoryVisibility: PassportCategoryVisibility) {
  return categoryVisibility[passportItemCategory(itemType)] !== false;
}

export function publicPassportShareUrl({
  origin = "https://terumbu.eco",
  publicSlug,
  visibility,
  shareToken
}: {
  origin?: string;
  publicSlug: string | null | undefined;
  visibility: string | null | undefined;
  shareToken?: string | null;
}) {
  const baseUrl = publicSlug ? `${origin}/passport/${publicSlug}` : `${origin}/passport`;

  if (normalizePassportVisibility(visibility) === "link" && shareToken) {
    return `${baseUrl}?token=${encodeURIComponent(shareToken)}`;
  }

  return baseUrl;
}

export function passportShareExpiresAtFromDateInput(value: FormDataEntryValue | null, now = new Date()) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = new Date(`${value.trim()}T23:59:59.999Z`);

  if (Number.isNaN(parsed.getTime()) || parsed <= now) {
    return null;
  }

  return parsed;
}

export function passportShareAccessCookieName(publicSlug: string) {
  return `terumbu_passport_share_${publicSlug.replace(/[^a-z0-9_-]/gi, "").slice(0, 80)}`;
}

export function passportShareAccessProof(publicSlug: string, shareToken: string, shareAccessHash: string) {
  return createHash("sha256").update(`${publicSlug}:${shareToken}:${shareAccessHash}`).digest("hex");
}

export function passportShareAccessStatus({
  visibility,
  isPublic,
  shareToken,
  providedToken,
  shareExpiresAt,
  now = new Date(),
  requiresAccessCode = false,
  accessCodeValid = false
}: {
  visibility: string | null | undefined;
  isPublic: boolean | null | undefined;
  shareToken?: string | null;
  providedToken?: string | null;
  shareExpiresAt?: Date | null;
  now?: Date;
  requiresAccessCode?: boolean;
  accessCodeValid?: boolean;
}) {
  const normalizedVisibility = normalizePassportVisibility(visibility);

  if (!isPublic || normalizedVisibility === "private") {
    return { ok: false, reason: "private" as const };
  }

  if (normalizedVisibility === "public") {
    return { ok: true, reason: "public" as const };
  }

  if (!shareToken || providedToken !== shareToken) {
    return { ok: false, reason: "token" as const };
  }

  if (shareExpiresAt && shareExpiresAt <= now) {
    return { ok: false, reason: "expired" as const };
  }

  if (requiresAccessCode && !accessCodeValid) {
    return { ok: false, reason: "access_code" as const };
  }

  return { ok: true, reason: "link" as const };
}
