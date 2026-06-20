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

  return "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1200&q=80";
}
