import { Buffer } from "node:buffer";

const MAX_DATABASE_IMAGE_BYTES = 1_500_000;
const databaseImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function getEvidenceStorageProvider() {
  if (process.env.CLOUDFLARE_R2_BUCKET && process.env.CLOUDFLARE_R2_ACCOUNT_ID) {
    return "cloudflare_r2";
  }

  return "local_demo";
}

export function normalizeEvidenceUrl(value: FormDataEntryValue | string | null | undefined) {
  const url = String(value ?? "").trim();

  if (url.startsWith("https://") || url.startsWith("/") || url.startsWith("data:image/")) {
    return url;
  }

  return null;
}

export async function readUploadedImageAsDataUrl(value: FormDataEntryValue | null | undefined) {
  if (!value || typeof value === "string") {
    return { dataUrl: null, error: null };
  }

  if (value.size === 0) {
    return { dataUrl: null, error: null };
  }

  if (!databaseImageTypes.has(value.type)) {
    return { dataUrl: null, error: "type" };
  }

  if (value.size > MAX_DATABASE_IMAGE_BYTES) {
    return { dataUrl: null, error: "size" };
  }

  const bytes = Buffer.from(await value.arrayBuffer());

  return {
    dataUrl: `data:${value.type};base64,${bytes.toString("base64")}`,
    error: null
  };
}
