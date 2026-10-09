import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  corporateReportArtifactLocalPaths,
  corporateReportArtifactStorageRoot,
  corporateReportArtifactStorageUrl
} from "@/lib/corporate-report-artifact-links";
import {
  r2CredentialsConfiguration,
  signedR2GetRequest,
  signedR2PutRequest,
  type R2CredentialsConfig
} from "@/lib/r2-storage";

// R2 report keys are deliberately separate from public images AND private
// evidence. A distinct, non-public bucket is required in production.
const R2_REPORT_PREFIX = "private-r2://corporate-reports/";
const R2_REPORT_OBJECT_PATTERN = /^private-reports\/corporate\/\d{4}\/[0-9a-f-]{36}\.pdf$/;
const REPORT_CONTENT_TYPE = "application/pdf";
const OBJECT_TIMEOUT_MS = 20_000;

export type StoredCorporatePdf = {
  url: string;
  sha256: string;
  byteLength: number;
  provider: "local_volume" | "cloudflare_r2_private";
};

export class CorporateReportStorageUnavailable extends Error {
  constructor() {
    super("Corporate report artifact storage is unavailable.");
    this.name = "CorporateReportStorageUnavailable";
  }
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function corporateReportStorageMode(env: Record<string, string | undefined> = process.env) {
  const mode = (env.CORPORATE_REPORT_STORAGE ?? "local").trim() || "local";
  if (mode !== "local" && mode !== "r2") {
    throw new Error("CORPORATE_REPORT_STORAGE must be 'local' or 'r2'.");
  }
  return mode;
}

export function corporateReportR2Credentials(env: Record<string, string | undefined> = process.env): R2CredentialsConfig {
  const credentialResult = r2CredentialsConfiguration(env);
  const privateBucket = (env.CORPORATE_REPORT_R2_BUCKET ?? "").trim();
  if (credentialResult.status !== "configured" || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(privateBucket)) {
    throw new CorporateReportStorageUnavailable();
  }
  // The existing media bucket may have a public custom domain. Report PDFs
  // must never be uploaded to a bucket that also serves public images.
  if (privateBucket === credentialResult.config.bucket) {
    throw new CorporateReportStorageUnavailable();
  }
  return { ...credentialResult.config, bucket: privateBucket };
}

export function corporateReportPrivateR2ObjectKey(now = new Date(), id = randomUUID()) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Invalid private report object identifier.");
  return `private-reports/corporate/${now.getUTCFullYear()}/${id}.pdf`;
}

export function corporateReportPrivateR2Url(objectKey: string) {
  if (!R2_REPORT_OBJECT_PATTERN.test(objectKey)) throw new Error("Invalid private report object key.");
  return `${R2_REPORT_PREFIX}${objectKey}`;
}

export function corporateReportPrivateR2Key(sourceUrl: string | null | undefined) {
  if (!sourceUrl?.startsWith(R2_REPORT_PREFIX)) return null;
  const key = sourceUrl.slice(R2_REPORT_PREFIX.length);
  return R2_REPORT_OBJECT_PATTERN.test(key) ? key : null;
}

type Fetcher = typeof fetch;

export async function storeCorporateReportPdf(input: {
  exportCode: string;
  pdf: Uint8Array;
  now?: Date;
  env?: Record<string, string | undefined>;
  fetchImpl?: Fetcher;
}): Promise<StoredCorporatePdf> {
  const now = input.now ?? new Date();
  const env = input.env ?? process.env;
  const digest = sha256(input.pdf);

  if (corporateReportStorageMode(env) === "r2") {
    const credentials = corporateReportR2Credentials(env);
    const objectKey = corporateReportPrivateR2ObjectKey(now);
    const signed = signedR2PutRequest(credentials, {
      objectKey,
      bytes: input.pdf,
      contentType: REPORT_CONTENT_TYPE,
      now
    });

    let response: Response;
    try {
      response = await (input.fetchImpl ?? fetch)(signed.url, {
        method: "PUT",
        headers: { ...signed.headers, "Cache-Control": "private, no-store" },
        body: Buffer.from(input.pdf),
        signal: AbortSignal.timeout(OBJECT_TIMEOUT_MS)
      });
    } catch {
      throw new CorporateReportStorageUnavailable();
    }
    if (!response.ok) throw new CorporateReportStorageUnavailable();

    return {
      url: corporateReportPrivateR2Url(objectKey),
      sha256: digest,
      byteLength: input.pdf.byteLength,
      provider: "cloudflare_r2_private"
    };
  }

  // Backwards-compatible, durable across web-container recreation provided the
  // deployment preserves the named reports volume. Never silently fall back
  // from an explicitly selected R2 mode to a local file when upload fails.
  // A database failure after writing must not strand all future retries on an
  // existing filename. Use a new immutable path for each local attempt too.
  const filename = `${input.exportCode.toLowerCase()}-${randomUUID()}.pdf`;
  const localUrl = corporateReportArtifactStorageUrl(filename);
  await mkdir(corporateReportArtifactStorageRoot(), { recursive: true });
  await writeFile(path.join(corporateReportArtifactStorageRoot(), filename), input.pdf, { flag: "wx" });
  return {
    url: localUrl,
    sha256: digest,
    byteLength: input.pdf.byteLength,
    provider: "local_volume"
  };
}

export async function readCorporateReportArtifact(input: {
  sourceUrl: string | null | undefined;
  expectedSha256?: string | null;
  env?: Record<string, string | undefined>;
  fetchImpl?: Fetcher;
}): Promise<Uint8Array | null> {
  const { sourceUrl } = input;
  if (!sourceUrl) return null;
  let bytes: Uint8Array | null = null;
  const r2Key = corporateReportPrivateR2Key(sourceUrl);
  if (r2Key) {
    const credentials = corporateReportR2Credentials(input.env ?? process.env);
    const signed = signedR2GetRequest(credentials, { objectKey: r2Key });
    let response: Response;
    try {
      response = await (input.fetchImpl ?? fetch)(signed.url, {
        method: "GET",
        headers: signed.headers,
        cache: "no-store",
        signal: AbortSignal.timeout(OBJECT_TIMEOUT_MS)
      });
    } catch {
      throw new CorporateReportStorageUnavailable();
    }
    if (response.status === 404) return null;
    if (!response.ok) throw new CorporateReportStorageUnavailable();
    try {
      bytes = new Uint8Array(await response.arrayBuffer());
    } catch {
      throw new CorporateReportStorageUnavailable();
    }
  } else {
    // Legacy files are served only from trusted, sandboxed local paths.
    // An unknown URL is NOT fetched over HTTP (avoid SSRF).
    for (const localPath of corporateReportArtifactLocalPaths(sourceUrl)) {
      try {
        bytes = await readFile(localPath);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw new CorporateReportStorageUnavailable();
        }
      }
    }
  }

  if (bytes && input.expectedSha256 && sha256(bytes) !== input.expectedSha256) {
    throw new CorporateReportStorageUnavailable();
  }
  return bytes;
}
