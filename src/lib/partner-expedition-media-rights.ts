/**
 * Partner-provided expedition imagery is public-facing. A rights declaration is
 * required only for newly uploaded media; unchanged drafts remain editable.
 */
export const expeditionPublicUploadFields = [
  "imageFile",
  "galleryImageFile",
  "preparationCourseImageFile"
] as const;

export function newExpeditionMediaUploadFields(formData: FormData): string[] {
  return expeditionPublicUploadFields.filter((name) =>
    formData.getAll(name).some((item) => item instanceof File && item.size > 0)
  );
}

export function expeditionMediaRightsValid(formData: FormData): boolean {
  return newExpeditionMediaUploadFields(formData).length === 0 ||
    (formData.get("mediaRightsConfirmed") === "on" && expeditionMediaProvenanceFromForm(formData) !== null);
}

export type ExpeditionMediaProvenance = {
  credit: string;
  rightsBasis: "creator" | "licensed" | "consented";
  reference: string;
  uploadFields: string[];
};

/** This is a private reviewer-facing declaration, not proof of copyright or consent. */
export function expeditionMediaProvenanceFromForm(formData: FormData): ExpeditionMediaProvenance | null {
  const uploads = newExpeditionMediaUploadFields(formData);
  if (uploads.length === 0) return null;

  const credit = String(formData.get("mediaCredit") ?? "").trim();
  const rightsBasis = String(formData.get("mediaRightsBasis") ?? "").trim();
  const reference = String(formData.get("mediaRightsReference") ?? "").trim();
  if (!credit || credit.length > 160 ||
    !["creator", "licensed", "consented"].includes(rightsBasis) ||
    reference.length < 8 || reference.length > 500) return null;

  return { credit, rightsBasis: rightsBasis as ExpeditionMediaProvenance["rightsBasis"], reference, uploadFields: uploads };
}

export function storedExpeditionMediaProvenance(metadata: unknown): ExpeditionMediaProvenance | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).mediaProvenance;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.credit !== "string" || typeof record.reference !== "string" ||
    !["creator", "licensed", "consented"].includes(String(record.rightsBasis))) return null;
  return {
    credit: record.credit,
    rightsBasis: record.rightsBasis as ExpeditionMediaProvenance["rightsBasis"],
    reference: record.reference,
    uploadFields: Array.isArray(record.uploadFields) ? record.uploadFields.filter((item): item is string => typeof item === "string") : []
  };
}

/**
 * Earlier implementations saved only the last upload declaration. Read that
 * record as the first entry so replacing one photo never erases previous
 * declarations for retained gallery/preparation photos.
 */
export function storedExpeditionMediaProvenanceHistory(metadata: unknown): ExpeditionMediaProvenance[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const root = metadata as Record<string, unknown>;
  const saved = Array.isArray(root.mediaProvenanceHistory) ? root.mediaProvenanceHistory : [];
  const history = saved
    .map((entry) => storedExpeditionMediaProvenance({ mediaProvenance: entry }))
    .filter((entry): entry is ExpeditionMediaProvenance => entry !== null);
  const legacy = storedExpeditionMediaProvenance(metadata);
  if (legacy && !history.some((entry) => JSON.stringify(entry) === JSON.stringify(legacy))) {
    history.unshift(legacy);
  }
  return history;
}

export function appendExpeditionMediaProvenance(
  metadata: unknown,
  newUpload: ExpeditionMediaProvenance | null
): ExpeditionMediaProvenance[] {
  const existing = storedExpeditionMediaProvenanceHistory(metadata);
  return newUpload ? [...existing, newUpload] : existing;
}
