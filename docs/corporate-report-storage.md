# Corporate PDF artifact storage (private R2)

## Design and security boundary

Terumbu's corporate reports are not public objects. The application writes
PDFs to a private bucket and persists opaque object references in
`corporate_report_exports`. Downloads always go through the existing
authorized corporate route or the public route restricted to **published**
reports. An R2 object reference must never be rendered as a direct public URL.

This applies to both ESG/CSR PDFs (including scheduled reports) and
donation/expedition activity PDFs.

Production environment:

- `CORPORATE_REPORT_STORAGE=r2`
- `CORPORATE_REPORT_R2_BUCKET=<dedicated private R2 bucket>`
- `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`,
  `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET`, and
  `CLOUDFLARE_R2_PUBLIC_BASE_URL` remain the existing media configuration.

The report bucket **must be different** from `CLOUDFLARE_R2_BUCKET`.
It must have no public R2.dev endpoint, public custom domain, or broad public
read policy. Grant the server's R2 token scoped read/write access to the
dedicated bucket. Restrict credentials to the server-side environment only.

`CORPORATE_REPORT_STORAGE=local` (default) preserves the existing persistent
Docker volume behavior without external storage; this is a compatibility mode,
**not** off-host disaster recovery.

## Fail-closed behavior

1. Select `r2` only when the private bucket and credentials exist.
2. The generator creates an opaque, one-time PDF object key under
   `private-reports/corporate/YYYY/<uuid>.pdf`.
3. It signs an S3 PUT to the private bucket. If the PUT fails, the generator
   throws; no report is marked generated and scheduled jobs retain their retry.
4. On success the report's metadata includes `pdfUrl`, `pdfSha256`,
   `pdfByteLength`, and `artifactStorageProvider`. ESG report manifests
   also refer to the private object.
5. Authorized downloads use a signed server-to-R2 GET and verify SHA-256.
   They return **503** on storage outages/integrity mismatches; a genuinely
   missing file gives **404**. There is no fallback to an unrelated local
   artifact and no arbitrary URL fetching.
6. Public PDF downloads continue to require status `published`; JSON,
   evidence bundles, and unpublished reports are not exposed publicly.

## Rollout

Deploy with default local mode first. Create and protect the private R2 bucket,
then set `CORPORATE_REPORT_STORAGE=r2` and
`CORPORATE_REPORT_R2_BUCKET` in GitHub Actions production
variables/secrets. Confirm a new report can be generated and downloaded by
an authorized user, that an unauthenticated draft download is denied, and that
the published-PDF route works.

**Existing PDFs are not automatically migrated.** They continue to resolve
through the persistent Docker volume. Take an off-host backup of
`terumbu_generated_reports` before switching storage, and retain the volume
until an audited migration of legacy report rows/artifacts has completed.
Copying PostgreSQL alone does not back up historical local PDFs.

R2 must also be protected by independent backup/versioning and restoration
procedures suitable for the business retention policy. The application cannot
claim disaster-recovery readiness from successful upload alone.

## Rollback

To stop new uploads without deleting existing R2 objects, set
`CORPORATE_REPORT_STORAGE=local` while retaining the private R2 credentials
and bucket configuration for **reading** previously generated R2 reports.
Do not clear bucket credentials until those reports have been migrated to
another storage provider. Rollback changes only where **new** PDFs are written.
