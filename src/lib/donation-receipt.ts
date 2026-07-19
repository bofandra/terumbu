export type DonationReceiptDownloadRecord = {
  donationId: string;
  receiptNumber: string;
  issuedAt: Date;
  emailedAt: Date | null;
  payload: unknown;
  donorName: string | null;
  donorEmail: string | null;
  amount: string | number;
  currency: string;
  status: string;
  createdAt: Date;
  campaignTitle: string;
  campaignSlug: string;
  organizationName: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function metadataString(metadata: unknown, key: string) {
  const value = metadataRecord(metadata)[key];

  return typeof value === "string" ? value : null;
}

function formatCurrency(value: string | number, currency: string) {
  const parsed = typeof value === "number" ? value : Number(value);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency || "IDR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function donationReceiptFilename(receipt: Pick<DonationReceiptDownloadRecord, "receiptNumber">) {
  const safeNumber = receipt.receiptNumber
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `terumbu-receipt-${safeNumber || "donation"}.html`;
}

export function donationReceiptHolderName(receipt: Pick<DonationReceiptDownloadRecord, "donorEmail" | "donorName">) {
  return receipt.donorName || receipt.donorEmail || "Terumbu.eco supporter";
}

export function donationReceiptProviderReference(receipt: Pick<DonationReceiptDownloadRecord, "payload">) {
  return metadataString(receipt.payload, "providerReference") ?? metadataString(receipt.payload, "paymentReference") ?? "Recorded";
}

export function buildDonationReceiptDownloadHtml(receipt: DonationReceiptDownloadRecord, origin = "https://terumbu.eco") {
  const holderName = donationReceiptHolderName(receipt);
  const providerReference = donationReceiptProviderReference(receipt);
  const issuedAt = formatDate(receipt.issuedAt);
  const campaignUrl = `${origin}/campaigns/${receipt.campaignSlug}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(receipt.receiptNumber)} - Terumbu.eco Donation Receipt</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #07343f; background: #f6f0e6; }
    main { max-width: 900px; margin: 40px auto; padding: 40px; background: white; border: 1px solid #d8e4dc; }
    .eyebrow { color: #cc5f45; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
    h1 { font-size: 40px; margin: 16px 0 8px; }
    h2 { font-size: 26px; margin: 0 0 28px; color: #126f6f; }
    dl { display: grid; grid-template-columns: 190px 1fr; gap: 12px 20px; margin-top: 28px; }
    dt { color: #60737a; font-weight: 700; }
    dd { margin: 0; font-weight: 700; }
    a { color: #126f6f; }
    .seal { margin-top: 32px; padding: 16px; background: #e4f3e9; border-radius: 14px; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Terumbu.eco Donation Receipt</p>
    <h1>${escapeHtml(receipt.receiptNumber)}</h1>
    <h2>${escapeHtml(holderName)}</h2>
    <dl>
      <dt>Campaign</dt>
      <dd><a href="${escapeHtml(campaignUrl)}">${escapeHtml(receipt.campaignTitle)}</a></dd>
      <dt>Partner</dt>
      <dd>${escapeHtml(receipt.organizationName)}</dd>
      <dt>Amount</dt>
      <dd>${escapeHtml(formatCurrency(receipt.amount, receipt.currency))}</dd>
      <dt>Status</dt>
      <dd>${escapeHtml(receipt.status)}</dd>
      <dt>Issued</dt>
      <dd>${escapeHtml(issuedAt)}</dd>
      <dt>Provider reference</dt>
      <dd>${escapeHtml(providerReference)}</dd>
      <dt>Donor email</dt>
      <dd>${escapeHtml(receipt.donorEmail ?? "Not recorded")}</dd>
    </dl>
    <p class="seal">This receipt is generated from the Terumbu.eco donation and payment records connected to this account.</p>
  </main>
</body>
</html>`;
}
