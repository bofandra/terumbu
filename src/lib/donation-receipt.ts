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
    currencyDisplay: "code",
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

  return `terumbu-receipt-${safeNumber || "donation"}.pdf`;
}

export function donationReceiptHolderName(receipt: Pick<DonationReceiptDownloadRecord, "donorEmail" | "donorName">) {
  return receipt.donorName || receipt.donorEmail || "Terumbu.eco supporter";
}

export function donationReceiptProviderReference(receipt: Pick<DonationReceiptDownloadRecord, "payload">) {
  return metadataString(receipt.payload, "providerReference") ?? metadataString(receipt.payload, "paymentReference") ?? "Recorded";
}

type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  size: number;
  font?: "regular" | "bold";
  color?: string;
};

const PDF_PAGE_WIDTH = 595;
const PDF_PAGE_HEIGHT = 842;
const PDF_COLORS = {
  coral: "0.800 0.373 0.271",
  kelp: "0.071 0.435 0.435",
  ocean: "0.027 0.204 0.247",
  muted: "0.376 0.451 0.478",
  sand: "0.965 0.941 0.902",
  white: "1 1 1",
  border: "0.847 0.894 0.863",
  seal: "0.894 0.953 0.914"
};

function sanitizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfString(value: string) {
  return sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapPdfText(value: string, maxWidth: number, fontSize: number) {
  const normalized = sanitizePdfText(value);
  const averageCharacterWidth = fontSize * 0.52;
  const maxCharacters = Math.max(12, Math.floor(maxWidth / averageCharacterWidth));
  const lines: string[] = [];

  for (const word of normalized.split(" ")) {
    if (word.length > maxCharacters) {
      for (let index = 0; index < word.length; index += maxCharacters) {
        lines.push(word.slice(index, index + maxCharacters));
      }
      continue;
    }

    const current = lines.at(-1);

    if (!current) {
      lines.push(word);
      continue;
    }

    if (`${current} ${word}`.length <= maxCharacters) {
      lines[lines.length - 1] = `${current} ${word}`;
      continue;
    }

    lines.push(word.slice(0, maxCharacters));
  }

  return lines.length ? lines : [""];
}

function textCommand({ text, x, y, size, font = "regular", color = PDF_COLORS.ocean }: PdfTextLine) {
  const fontResource = font === "bold" ? "F2" : "F1";

  return `BT /${fontResource} ${size} Tf ${color} rg ${x} ${y} Td (${escapePdfString(text)}) Tj ET`;
}

function rectangleCommand(x: number, y: number, width: number, height: number, fill: string, stroke?: string) {
  const fillCommand = `q ${fill} rg ${x} ${y} ${width} ${height} re f Q`;
  const strokeCommand = stroke ? `q ${stroke} RG 1 w ${x} ${y} ${width} ${height} re S Q` : "";

  return [fillCommand, strokeCommand].filter(Boolean).join("\n");
}

function buildPdfDocument(contentStream: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`
  ];
  const parts = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(parts.join("").length);
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = parts.join("").length;
  parts.push(`xref\n0 ${objects.length + 1}\n`);
  parts.push("0000000000 65535 f \n");

  offsets.slice(1).forEach((offset) => {
    parts.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  });

  parts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return new TextEncoder().encode(parts.join(""));
}

export function buildDonationReceiptDownloadPdf(receipt: DonationReceiptDownloadRecord, origin = "https://terumbu.eco") {
  const holderName = donationReceiptHolderName(receipt);
  const providerReference = donationReceiptProviderReference(receipt);
  const issuedAt = formatDate(receipt.issuedAt);
  const campaignUrl = `${origin}/campaigns/${receipt.campaignSlug}`;
  const rows = [
    ["Campaign", receipt.campaignTitle],
    ["Campaign URL", campaignUrl],
    ["Partner", receipt.organizationName],
    ["Amount", formatCurrency(receipt.amount, receipt.currency)],
    ["Status", receipt.status],
    ["Issued", issuedAt],
    ["Provider reference", providerReference],
    ["Donor email", receipt.donorEmail ?? "Not recorded"]
  ];
  const commands = [
    rectangleCommand(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, PDF_COLORS.sand),
    rectangleCommand(48, 80, 499, 682, PDF_COLORS.white, PDF_COLORS.border),
    textCommand({ text: "Terumbu.eco Donation Receipt", x: 76, y: 722, size: 11, font: "bold", color: PDF_COLORS.coral }),
    textCommand({ text: receipt.receiptNumber, x: 76, y: 684, size: 28, font: "bold" }),
    textCommand({ text: holderName, x: 76, y: 654, size: 18, font: "bold", color: PDF_COLORS.kelp })
  ];
  let y = 594;

  rows.forEach(([label, value]) => {
    const wrappedValue = wrapPdfText(value, 292, 11);

    commands.push(textCommand({ text: label, x: 76, y, size: 10, font: "bold", color: PDF_COLORS.muted }));
    wrappedValue.forEach((line, index) => {
      commands.push(textCommand({ text: line, x: 230, y: y - index * 15, size: 11, font: "bold" }));
    });
    y -= Math.max(30, wrappedValue.length * 15 + 10);
  });

  commands.push(rectangleCommand(76, 128, 443, 62, PDF_COLORS.seal));
  wrapPdfText("This receipt is generated from the Terumbu.eco donation and payment records connected to this account.", 393, 11).forEach((line, index) => {
    commands.push(textCommand({ text: line, x: 100, y: 164 - index * 15, size: 11, font: "bold", color: PDF_COLORS.ocean }));
  });
  commands.push(textCommand({ text: "Generated by Terumbu.eco", x: 76, y: 102, size: 9, color: PDF_COLORS.muted }));

  return buildPdfDocument(commands.join("\n"));
}
