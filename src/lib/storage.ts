export function getEvidenceStorageProvider() {
  if (process.env.CLOUDFLARE_R2_BUCKET && process.env.CLOUDFLARE_R2_ACCOUNT_ID) {
    return "cloudflare_r2";
  }

  return "local_demo";
}

export function normalizeEvidenceUrl(value: FormDataEntryValue | string | null | undefined) {
  const url = String(value ?? "").trim();

  if (url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }

  return null;
}
