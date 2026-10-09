import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  CorporateReportStorageUnavailable,
  corporateReportPrivateR2Key,
  corporateReportPrivateR2ObjectKey,
  corporateReportPrivateR2Url,
  corporateReportR2Credentials,
  corporateReportStorageMode,
  readCorporateReportArtifact,
  storeCorporateReportPdf
} from "../src/lib/corporate-report-storage";

const env = {
  CORPORATE_REPORT_STORAGE: "r2",
  CORPORATE_REPORT_R2_BUCKET: "terumbu-corporate-private",
  CLOUDFLARE_R2_ACCOUNT_ID: "r2-account",
  CLOUDFLARE_R2_BUCKET: "terumbu-public-media",
  CLOUDFLARE_R2_ACCESS_KEY_ID: "key-id",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "not-a-real-secret",
  CLOUDFLARE_R2_PUBLIC_BASE_URL: "https://media.example.test"
};
const pdf = Buffer.from("%PDF-1.4\nexample\n", "utf8");
const digest = createHash("sha256").update(pdf).digest("hex");

test("report storage is local by default and rejects unexpected modes", () => {
  assert.equal(corporateReportStorageMode({}), "local");
  assert.equal(corporateReportStorageMode(env), "r2");
  assert.throws(() => corporateReportStorageMode({ CORPORATE_REPORT_STORAGE: "public" }), /local.*r2/);
});

test("R2 storage requires a distinct private bucket and full credentials", () => {
  assert.equal(corporateReportR2Credentials(env).bucket, "terumbu-corporate-private");
  assert.throws(() => corporateReportR2Credentials({
    ...env,
    CORPORATE_REPORT_R2_BUCKET: "terumbu-public-media"
  }), CorporateReportStorageUnavailable);
  assert.throws(() => corporateReportR2Credentials({
    ...env,
    CORPORATE_REPORT_R2_BUCKET: ""
  }), CorporateReportStorageUnavailable);
  assert.throws(() => corporateReportR2Credentials({
    ...env,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: ""
  }), CorporateReportStorageUnavailable);
});

test("R2 object keys are private, opaque and strictly validated", () => {
  const key = corporateReportPrivateR2ObjectKey(
    new Date("2026-10-10T02:12:00.000Z"), "123e4567-e89b-12d3-a456-426614174000"
  );
  assert.equal(key, "private-reports/corporate/2026/123e4567-e89b-12d3-a456-426614174000.pdf");
  const source = corporateReportPrivateR2Url(key);
  assert.equal(corporateReportPrivateR2Key(source), key);
  assert.equal(corporateReportPrivateR2Key("https://media.example.test/secrets.pdf"), null);
  assert.equal(corporateReportPrivateR2Key("private-r2://corporate-reports/../secret.pdf"), null);
  assert.equal(corporateReportPrivateR2Key(source + "?redirect=https://example.test"), null);
  assert.throws(() => corporateReportPrivateR2Url("public-media/report.pdf"), /Invalid/);
});

test("successful R2 upload produces a private reference, sha256 and signed retrieval", async () => {
  const requests: Array<{ url: string; method: string; authorization: string | null }> = [];
  const mockFetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: String(url),
      method: String(init?.method),
      authorization: new Headers(init?.headers).get("authorization")
    });
    if (init?.method === "PUT") {
      assert.equal(new Headers(init.headers).get("content-type"), "application/pdf");
      assert.deepEqual(Buffer.from(init.body as Buffer), pdf);
      return new Response(null, { status: 200 });
    }
    return new Response(pdf, { status: 200, headers: { "Content-Type": "application/pdf" } });
  }) as typeof fetch;

  const saved = await storeCorporateReportPdf({
    exportCode: "TRB-ESG-2026-DEMO",
    pdf,
    env,
    fetchImpl: mockFetch
  });

  assert.equal(saved.provider, "cloudflare_r2_private");
  assert.equal(saved.sha256, digest);
  assert.equal(saved.byteLength, pdf.byteLength);
  assert.match(saved.url, /^private-r2:\/\/corporate-reports\/private-reports\/corporate\/\d{4}\//);
  assert.equal(corporateReportPrivateR2Key(saved.url)?.endsWith(".pdf"), true);
  const fetched = await readCorporateReportArtifact({ sourceUrl: saved.url, expectedSha256: digest, env, fetchImpl: mockFetch });
  assert.deepEqual(Buffer.from(fetched!), pdf);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].method, "PUT");
  assert.equal(requests[1].method, "GET");
  assert.equal(requests[0].url.includes("/terumbu-corporate-private/private-reports/corporate/"), true);
  assert.equal(requests[1].url, requests[0].url);
  assert.match(requests[0].authorization ?? "", /^AWS4-HMAC-SHA256/);
  assert.ok(!requests[0].authorization?.includes("not-a-real-secret"));
});

test("R2 failure never falls back to local and cannot mark report generation successful", async () => {
  const failingFetch = (async () => new Response(null, { status: 503 })) as typeof fetch;
  await assert.rejects(
    storeCorporateReportPdf({ exportCode: "TRB-FAIL", pdf, env, fetchImpl: failingFetch }),
    CorporateReportStorageUnavailable
  );
  assert.equal(
    await readCorporateReportArtifact({
      sourceUrl: corporateReportPrivateR2Url(corporateReportPrivateR2ObjectKey()),
      env,
      fetchImpl: (async () => new Response(null, { status: 404 })) as typeof fetch
    }),
    null
  );
  await assert.rejects(
    readCorporateReportArtifact({
      sourceUrl: corporateReportPrivateR2Url(corporateReportPrivateR2ObjectKey()),
      env,
      fetchImpl: failingFetch
    }),
    CorporateReportStorageUnavailable
  );
});

test("SHA-256 verification detects corrupted remote artifacts", async () => {
  await assert.rejects(
    readCorporateReportArtifact({
      sourceUrl: corporateReportPrivateR2Url(corporateReportPrivateR2ObjectKey()),
      expectedSha256: digest,
      env,
      fetchImpl: (async () => new Response(Buffer.from("corrupted PDF"))) as typeof fetch
    }),
    CorporateReportStorageUnavailable
  );
  const unknown = await readCorporateReportArtifact({
    sourceUrl: "https://evil.example.test/pdf",
    env,
    fetchImpl: (async () => { throw new Error("Unknown URLs must never be fetched"); }) as typeof fetch
  });
  assert.equal(unknown, null);
});
