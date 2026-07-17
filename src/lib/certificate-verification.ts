export type CertificateVerificationRecord = {
  certificateNumber: string;
  publicSlug: string;
  issuedAt: Date;
  metadata: unknown;
  courseTitle: string;
  courseSlug: string;
  userName: string | null;
  displayName: string | null;
};

function metadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return (metadata as Record<string, unknown>)[key] ?? null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function certificateHolderName(certificate: Pick<CertificateVerificationRecord, "displayName" | "userName">) {
  return certificate.displayName || certificate.userName || "Verified learner";
}

export function certificateCredentialName(certificate: Pick<CertificateVerificationRecord, "metadata" | "courseTitle">) {
  const credential = metadataValue(certificate.metadata, "credential");

  return typeof credential === "string" && credential.trim() ? credential.trim() : certificate.courseTitle;
}

export function certificateScore(certificate: Pick<CertificateVerificationRecord, "metadata">) {
  const score = metadataValue(certificate.metadata, "score");

  if (typeof score === "number" && Number.isFinite(score)) {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  if (typeof score === "string") {
    const normalized = score.replace(/[^0-9.-]/g, "");
    const parsed = normalized ? Number(normalized) : Number.NaN;

    return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : null;
  }

  return null;
}

export function certificateVerificationUrl(publicSlug: string, origin = "https://terumbu.eco") {
  return `${origin}/certificates/verify/${publicSlug}`;
}

export function certificateDownloadFilename(certificate: Pick<CertificateVerificationRecord, "certificateNumber">) {
  const safeNumber = certificate.certificateNumber
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `terumbu-certificate-${safeNumber || "verified"}.html`;
}

export function certificateStatusLabel(certificate: Pick<CertificateVerificationRecord, "issuedAt">) {
  return certificate.issuedAt.getTime() <= Date.now() ? "Verified certificate" : "Issued certificate";
}

export function buildCertificateDownloadHtml(certificate: CertificateVerificationRecord, origin = "https://terumbu.eco") {
  const holderName = certificateHolderName(certificate);
  const credentialName = certificateCredentialName(certificate);
  const score = certificateScore(certificate);
  const verificationUrl = certificateVerificationUrl(certificate.publicSlug, origin);
  const issuedAt = certificate.issuedAt.toISOString().slice(0, 10);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(certificate.certificateNumber)} - Terumbu.eco Certificate</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #07343f; background: #f6f0e6; }
    main { max-width: 920px; margin: 40px auto; padding: 40px; background: white; border: 1px solid #d8e4dc; }
    .eyebrow { color: #cc5f45; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
    h1 { font-size: 42px; margin: 16px 0 8px; }
    h2 { font-size: 28px; margin: 0 0 28px; color: #126f6f; }
    dl { display: grid; grid-template-columns: 180px 1fr; gap: 12px 20px; margin-top: 32px; }
    dt { color: #60737a; font-weight: 700; }
    dd { margin: 0; font-weight: 700; }
    .seal { margin-top: 32px; padding: 16px; background: #e4f3e9; border-radius: 14px; font-weight: 700; }
    a { color: #126f6f; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Terumbu.eco Verified Learning Credential</p>
    <h1>${escapeHtml(holderName)}</h1>
    <h2>${escapeHtml(credentialName)}</h2>
    <dl>
      <dt>Certificate number</dt>
      <dd>${escapeHtml(certificate.certificateNumber)}</dd>
      <dt>Course</dt>
      <dd>${escapeHtml(certificate.courseTitle)}</dd>
      <dt>Issued</dt>
      <dd>${escapeHtml(issuedAt)}</dd>
      <dt>Assessment score</dt>
      <dd>${score === null ? "Recorded" : `${score}/100`}</dd>
      <dt>Verification URL</dt>
      <dd><a href="${escapeHtml(verificationUrl)}">${escapeHtml(verificationUrl)}</a></dd>
    </dl>
    <p class="seal">This certificate record is verifiable through Terumbu.eco. It confirms course completion and does not represent professional licensing.</p>
  </main>
</body>
</html>`;
}
