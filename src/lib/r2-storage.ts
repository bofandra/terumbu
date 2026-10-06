import { createHash, createHmac, randomBytes } from "node:crypto";

const R2_ENV_KEYS = [
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_BUCKET",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_PUBLIC_BASE_URL"
] as const;

export type R2StorageConfig = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

export type R2StorageConfiguration =
  | { status: "disabled"; missing: string[]; config: null }
  | { status: "incomplete"; missing: string[]; config: null }
  | { status: "configured"; missing: []; config: R2StorageConfig };

function trimmed(value: string | undefined) {
  return value?.trim() || "";
}

export function r2StorageConfiguration(env: NodeJS.ProcessEnv = process.env): R2StorageConfiguration {
  const values = Object.fromEntries(R2_ENV_KEYS.map((key) => [key, trimmed(env[key])])) as Record<(typeof R2_ENV_KEYS)[number], string>;
  const configuredCount = R2_ENV_KEYS.filter((key) => values[key]).length;
  const missing = R2_ENV_KEYS.filter((key) => !values[key]);

  if (configuredCount === 0) {
    return { status: "disabled", missing: [...missing], config: null };
  }

  if (missing.length > 0) {
    return { status: "incomplete", missing: [...missing], config: null };
  }

  let publicBaseUrl: URL;
  try {
    publicBaseUrl = new URL(values.CLOUDFLARE_R2_PUBLIC_BASE_URL);
  } catch {
    return { status: "incomplete", missing: ["CLOUDFLARE_R2_PUBLIC_BASE_URL"], config: null };
  }

  if (publicBaseUrl.protocol !== "https:") {
    return { status: "incomplete", missing: ["CLOUDFLARE_R2_PUBLIC_BASE_URL"], config: null };
  }

  return {
    status: "configured",
    missing: [],
    config: {
      accountId: values.CLOUDFLARE_R2_ACCOUNT_ID,
      bucket: values.CLOUDFLARE_R2_BUCKET,
      accessKeyId: values.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: values.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      publicBaseUrl: publicBaseUrl.toString().replace(/\/$/, "")
    }
  };
}

function sha256Hex(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalObjectPath(bucket: string, objectKey: string) {
  return `/${[bucket, ...objectKey.split("/")].map(encodePathSegment).join("/")}`;
}

function amzTimestamp(now: Date) {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

export function publicMediaObjectKey(contentType: string, now = new Date(), token = randomBytes(16).toString("hex")) {
  const extension =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/png"
        ? "png"
        : contentType === "image/webp"
          ? "webp"
          : contentType === "image/gif"
            ? "gif"
            : "bin";

  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  return `public-media/${year}/${month}/${day}/${token}.${extension}`;
}

export function publicMediaAppUrl(objectKey: string) {
  return `/media/${objectKey.split("/").map(encodePathSegment).join("/")}`;
}

export function publicR2ObjectUrl(config: R2StorageConfig, objectKey: string) {
  return `${config.publicBaseUrl}/${objectKey.split("/").map(encodePathSegment).join("/")}`;
}

export function signedR2PutRequest(
  config: R2StorageConfig,
  input: {
    objectKey: string;
    bytes: Uint8Array;
    contentType: string;
    now?: Date;
  }
) {
  const now = input.now ?? new Date();
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = canonicalObjectPath(config.bucket, input.objectKey);
  const timestamp = amzTimestamp(now);
  const date = timestamp.slice(0, 8);
  const payloadHash = sha256Hex(input.bytes);
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${timestamp}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${date}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", timestamp, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, date);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "Content-Type": input.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": timestamp
    }
  };
}

export async function uploadPublicImageToR2(input: {
  config: R2StorageConfig;
  bytes: Uint8Array;
  contentType: string;
  now?: Date;
}) {
  const objectKey = publicMediaObjectKey(input.contentType, input.now);
  const request = signedR2PutRequest(input.config, {
    objectKey,
    bytes: input.bytes,
    contentType: input.contentType,
    now: input.now
  });
  const response = await fetch(request.url, {
    method: "PUT",
    headers: request.headers,
    body: Buffer.from(input.bytes)
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`R2 upload failed with ${response.status}: ${detail}`);
  }

  return {
    objectKey,
    url: publicMediaAppUrl(objectKey),
    provider: "cloudflare_r2" as const
  };
}
