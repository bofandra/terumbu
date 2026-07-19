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
    * { box-sizing: border-box; }
    @page { size: A4 landscape; margin: 10mm; }
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 32px; font-family: Arial, sans-serif; color: #07343f; background: #f6f0e6; }
    main { width: min(100%, 1040px); min-height: 640px; display: flex; flex-direction: column; justify-content: center; padding: 56px; background: white; border: 1px solid #d8e4dc; border-radius: 24px; box-shadow: 0 18px 60px rgba(7, 52, 63, 0.12); }
    .eyebrow { color: #cc5f45; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
    h1 { font-size: 48px; line-height: 1.05; margin: 18px 0 10px; overflow-wrap: anywhere; }
    h2 { font-size: 28px; margin: 0 0 28px; color: #126f6f; }
    dl { display: grid; grid-template-columns: 180px 1fr; gap: 12px 20px; margin-top: 32px; }
    dt { color: #60737a; font-weight: 700; }
    dd { margin: 0; font-weight: 700; overflow-wrap: anywhere; }
    .seal { margin-top: 32px; padding: 16px; background: #e4f3e9; border-radius: 14px; font-weight: 700; }
    a { color: #126f6f; overflow-wrap: anywhere; }
    @media print {
      body { min-height: auto; display: block; padding: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      main { width: 100%; min-height: 178mm; margin: 0; padding: 18mm; border-radius: 0; box-shadow: none; break-inside: avoid; page-break-inside: avoid; }
      h1 { max-width: 175mm; font-size: 34pt; }
      h2 { font-size: 16pt; }
      dl { grid-template-columns: 45mm 1fr; gap: 4mm 7mm; font-size: 10pt; }
      .seal { margin-top: 10mm; padding: 5mm; }
    }
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
