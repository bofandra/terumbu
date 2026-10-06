import { Buffer } from "node:buffer";

import {
  r2CredentialsConfiguration,
  r2StorageConfiguration,
  uploadPrivateImageToR2,
  uploadPublicImageToR2
} from "@/lib/r2-storage";

export const MAX_DATABASE_IMAGE_BYTES = 1_500_000;
export const MAX_PUBLIC_IMAGE_BYTES = MAX_DATABASE_IMAGE_BYTES;
const databaseImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type UploadedImageResult = {
  dataUrl: string | null;
  error: "type" | "size" | "storage" | null;
  storageProvider?: "database_inline" | "cloudflare_r2" | null;
  objectKey?: string | null;
  contentType?: string | null;
};

function emptyUpload(): UploadedImageResult {
  return { dataUrl: null, error: null, storageProvider: null, objectKey: null, contentType: null };
}

async function validatedImageBytes(value: FormDataEntryValue | null | undefined) {
  if (!value || typeof value === "string" || value.size === 0) {
    return { file: null, bytes: null, error: null as "type" | "size" | null };
  }

  if (!databaseImageTypes.has(value.type)) {
    return { file: value, bytes: null, error: "type" as const };
  }

  if (value.size > MAX_DATABASE_IMAGE_BYTES) {
    return { file: value, bytes: null, error: "size" as const };
  }

  return {
    file: value,
    bytes: new Uint8Array(await value.arrayBuffer()),
    error: null
  };
}

export function getEvidenceStorageProvider() {
  return r2CredentialsConfiguration().status === "configured" ? "cloudflare_r2" : "local_demo";
}

export function normalizeEvidenceUrl(value: FormDataEntryValue | string | null | undefined) {
  const url = String(value ?? "").trim();

  if (url.startsWith("https://") || url.startsWith("/") || url.startsWith("data:image/")) {
    return url;
  }

  return null;
}

export async function readUploadedImageAsDataUrl(value: FormDataEntryValue | null | undefined): Promise<UploadedImageResult> {
  const upload = await validatedImageBytes(value);

  if (!upload.file) {
    return emptyUpload();
  }

  if (upload.error || !upload.bytes) {
    return { dataUrl: null, error: upload.error, storageProvider: null, objectKey: null, contentType: null };
  }

  return {
    dataUrl: `data:${upload.file.type};base64,${Buffer.from(upload.bytes).toString("base64")}`,
    error: null,
    storageProvider: "database_inline",
    objectKey: null,
    contentType: upload.file.type
  };
}

export async function storeUploadedPublicImage(value: FormDataEntryValue | null | undefined): Promise<UploadedImageResult> {
  const upload = await validatedImageBytes(value);

  if (!upload.file) {
    return emptyUpload();
  }

  if (upload.error || !upload.bytes) {
    return { dataUrl: null, error: upload.error, storageProvider: null, objectKey: null, contentType: null };
  }

  const configuration = r2StorageConfiguration();

  if (configuration.status === "incomplete") {
    console.error("Cloudflare R2 configuration is incomplete.", { missing: configuration.missing });
    return { dataUrl: null, error: "storage", storageProvider: null, objectKey: null, contentType: null };
  }

  if (configuration.status === "configured") {
    try {
      const stored = await uploadPublicImageToR2({
        config: configuration.config,
        bytes: upload.bytes,
        contentType: upload.file.type
      });

      return {
        dataUrl: stored.url,
        error: null,
        storageProvider: stored.provider,
        objectKey: stored.objectKey,
        contentType: upload.file.type
      };
    } catch (error) {
      console.error("Cloudflare R2 public media upload failed.", error);
      return { dataUrl: null, error: "storage", storageProvider: null, objectKey: null, contentType: null };
    }
  }

  return {
    dataUrl: `data:${upload.file.type};base64,${Buffer.from(upload.bytes).toString("base64")}`,
    error: null,
    storageProvider: "database_inline",
    objectKey: null,
    contentType: upload.file.type
  };
}

export async function storeUploadedPrivateImage(
  value: FormDataEntryValue | null | undefined,
  input: {
    namespace: string;
    appUrl: string;
  }
): Promise<UploadedImageResult> {
  const upload = await validatedImageBytes(value);

  if (!upload.file) {
    return emptyUpload();
  }

  if (upload.error || !upload.bytes) {
    return { dataUrl: null, error: upload.error, storageProvider: null, objectKey: null, contentType: null };
  }

  const configuration = r2CredentialsConfiguration();

  if (configuration.status === "incomplete") {
    console.error("Cloudflare R2 private storage configuration is incomplete.", { missing: configuration.missing });
    return { dataUrl: null, error: "storage", storageProvider: null, objectKey: null, contentType: null };
  }

  if (configuration.status === "configured") {
    try {
      const stored = await uploadPrivateImageToR2({
        config: configuration.config,
        namespace: input.namespace,
        bytes: upload.bytes,
        contentType: upload.file.type
      });

      return {
        dataUrl: input.appUrl,
        error: null,
        storageProvider: stored.provider,
        objectKey: stored.objectKey,
        contentType: upload.file.type
      };
    } catch (error) {
      console.error("Cloudflare R2 private media upload failed.", error);
      return { dataUrl: null, error: "storage", storageProvider: null, objectKey: null, contentType: null };
    }
  }

  return {
    dataUrl: `data:${upload.file.type};base64,${Buffer.from(upload.bytes).toString("base64")}`,
    error: null,
    storageProvider: "database_inline",
    objectKey: null,
    contentType: upload.file.type
  };
}
