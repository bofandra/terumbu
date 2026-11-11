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
    formData.get("mediaRightsConfirmed") === "on";
}
