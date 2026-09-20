import { buildPdfDocumentPages, PDF_COLORS, pdfRectangleCommand, pdfTextCommand, wrapPdfText } from "@/lib/pdf-document";
import {
  REPORT_CONTENT_WIDTH,
  REPORT_CONTENT_X,
  brandedReportPage,
  reportMetricCard,
  reportNoteBox,
  reportPeriod,
  reportSectionTitle
} from "@/lib/terumbu-report-pdf";

export type CorporateReportArtifactMetric = {
  label: string;
  value: string;
  support?: string | null;
};

export type CorporateReportArtifactPortfolioRow = {
  campaignTitle: string;
  region: string;
  allocationValue: number;
  utilization: number;
  statusLabel: string;
  organizationName?: string | null;
};

export type CorporateReportArtifactEvidenceRow = {
  evidenceCode: string;
  title: string;
  evidenceType: string;
  verificationStatus: string;
  campaignTitle: string;
  sourceHref?: string | null;
};

export type CorporateReportArtifactInput = {
  exportCode: string;
  reportTypeLabel: string;
  accountName: string;
  programName: string;
  generatedAt: Date;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  executiveMetrics: CorporateReportArtifactMetric[];
  financials: Record<string, number>;
  impactOutputs: Record<string, number>;
  portfolio: CorporateReportArtifactPortfolioRow[];
  evidence: CorporateReportArtifactEvidenceRow[];
};


export type CorporateActivityReportRow = {
  title: string;
  detail?: string | null;
  amount?: string | null;
  status?: string | null;
  occurredAt?: Date | null;
};

export type CorporateActivityReportInput = {
  exportCode: string;
  title: string;
  accountName: string;
  programName: string;
  generatedAt: Date;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  metrics: Array<{ label: string; value: string }>;
  rows: CorporateActivityReportRow[];
  evidence?: CorporateReportArtifactEvidenceRow[];
};

type SheetDefinition = {
  name: string;
  rows: Array<Array<string | number | null>>;
};

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

export function corporateReportCsv(rows: Array<Array<string | number | null | undefined>>) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function titleCase(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function corporateReportSheets(input: CorporateReportArtifactInput): SheetDefinition[] {
  return [
    {
      name: "Summary",
      rows: [
        ["Export code", input.exportCode],
        ["Report type", input.reportTypeLabel],
        ["Account", input.accountName],
        ["Program", input.programName],
        ["Generated at", input.generatedAt.toISOString()],
        [null, null],
        ["Metric", "Value", "Support"],
        ...input.executiveMetrics.map((metric) => [metric.label, metric.value, metric.support ?? ""]),
        [null, null],
        ["Financial metric", "Value"],
        ...Object.entries(input.financials).map(([key, value]) => [titleCase(key), value]),
        [null, null],
        ["Impact metric", "Value"],
        ...Object.entries(input.impactOutputs).map(([key, value]) => [titleCase(key), value])
      ]
    },
    {
      name: "Portfolio",
      rows: [
        ["Campaign", "Partner", "Region", "Allocation", "Utilization %", "Status"],
        ...input.portfolio.map((project) => [
          project.campaignTitle,
          project.organizationName ?? "",
          project.region,
          project.allocationValue,
          project.utilization,
          project.statusLabel
        ])
      ]
    },
    {
      name: "Evidence",
      rows: [
        ["Evidence code", "Title", "Type", "Status", "Campaign", "Source"],
        ...input.evidence.map((evidence) => [
          evidence.evidenceCode,
          evidence.title,
          evidence.evidenceType,
          evidence.verificationStatus,
          evidence.campaignTitle,
          evidence.sourceHref ?? ""
        ])
      ]
    }
  ];
}

export function corporateReportPortfolioCsv(input: CorporateReportArtifactInput) {
  return corporateReportCsv(corporateReportSheets(input).find((sheet) => sheet.name === "Portfolio")?.rows ?? []);
}

export function corporateReportEvidenceCsv(input: CorporateReportArtifactInput) {
  return corporateReportCsv(corporateReportSheets(input).find((sheet) => sheet.name === "Evidence")?.rows ?? []);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - remainder) / 26);
  }

  return name;
}

function worksheetXml(sheet: SheetDefinition) {
  const rows = sheet.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => {
          if (value === null || value === undefined) {
            return "";
          }

          const ref = `${columnName(columnIndex)}${rowIndex + 1}`;

          if (typeof value === "number" && Number.isFinite(value)) {
            return `<c r="${ref}"><v>${value}</v></c>`;
          }

          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
        })
        .join("");

      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries: Array<{ name: string; data: Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const data = entry.data;
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + data.length;
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, central, end]);
}

export function buildCorporateReportWorkbookXlsx(input: CorporateReportArtifactInput) {
  const sheets = corporateReportSheets(input);
  const worksheetEntries = sheets.map((sheet, index) => ({
    name: `xl/worksheets/sheet${index + 1}.xml`,
    data: Buffer.from(worksheetXml(sheet), "utf8")
  }));
  const workbookSheets = sheets
    .map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("");
  const workbookRels = sheets
    .map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
    .join("");
  const worksheetOverrides = sheets
    .map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("");

  return zip([
    {
      name: "[Content_Types].xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${worksheetOverrides}</Types>`, "utf8")
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`, "utf8")
    },
    {
      name: "xl/workbook.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`, "utf8")
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}</Relationships>`, "utf8")
    },
    ...worksheetEntries
  ]);
}

function activityTablePage(input: CorporateActivityReportInput, rows: CorporateActivityReportRow[], pageNumber: number, totalPages: number, rowOffset: number) {
  const commands = brandedReportPage({
    section: "Corporate impact report",
    title: input.title,
    subtitle: `${input.accountName} / ${input.programName}`,
    reportId: input.exportCode,
    generatedAt: input.generatedAt,
    pageNumber,
    totalPages,
    compactHeader: true
  });
  let y = 660;
  y = reportSectionTitle(commands, "Activity details", y, "Records included in this report are limited to activity attributed to this corporate program.") - 8;

  commands.push(pdfRectangleCommand(REPORT_CONTENT_X, y - 24, REPORT_CONTENT_WIDTH, 28, PDF_COLORS.wash, PDF_COLORS.border));
  commands.push(pdfTextCommand({ text: "DATE", x: 72, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  commands.push(pdfTextCommand({ text: "ACTIVITY", x: 133, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  commands.push(pdfTextCommand({ text: "DETAIL", x: 286, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  commands.push(pdfTextCommand({ text: "AMOUNT", x: 414, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  commands.push(pdfTextCommand({ text: "STATUS", x: 493, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  y -= 38;

  rows.forEach((row, index) => {
    const rowY = y - index * 38;
    const title = wrapPdfText(row.title, 140, 8.5).slice(0, 2);
    const detail = wrapPdfText(row.detail ?? "-", 116, 7.8).slice(0, 2);
    const date = row.occurredAt ? row.occurredAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" }) : "-";
    const bg = (rowOffset + index) % 2 === 0 ? PDF_COLORS.white : PDF_COLORS.wash;
    commands.push(pdfRectangleCommand(REPORT_CONTENT_X, rowY - 25, REPORT_CONTENT_WIDTH, 36, bg));
    commands.push(pdfTextCommand({ text: date, x: 72, y: rowY - 6, size: 7.6, color: PDF_COLORS.muted }));
    title.forEach((line, lineIndex) => commands.push(pdfTextCommand({ text: line, x: 133, y: rowY - 3 - lineIndex * 10, size: 8.3, font: "bold" })));
    detail.forEach((line, lineIndex) => commands.push(pdfTextCommand({ text: line, x: 286, y: rowY - 3 - lineIndex * 10, size: 7.7, color: PDF_COLORS.muted })));
    commands.push(pdfTextCommand({ text: row.amount ?? "-", x: 414, y: rowY - 6, size: 7.7, font: "bold" }));
    commands.push(pdfTextCommand({ text: row.status ?? "-", x: 493, y: rowY - 6, size: 7.4, font: "bold", color: PDF_COLORS.kelp }));
  });

  if (rows.length === 0) {
    commands.push(pdfTextCommand({ text: "No activity records were available for this reporting period.", x: REPORT_CONTENT_X, y: y - 24, size: 9.5, color: PDF_COLORS.muted }));
  }

  return commands.join("\n");
}

function evidenceTablePage(input: CorporateActivityReportInput, evidence: CorporateReportArtifactEvidenceRow[], pageNumber: number, totalPages: number) {
  const commands = brandedReportPage({
    section: "Corporate impact report",
    title: "Evidence and verification",
    subtitle: `${input.accountName} / ${input.programName}`,
    reportId: input.exportCode,
    generatedAt: input.generatedAt,
    pageNumber,
    totalPages,
    compactHeader: true
  });
  let y = 660;
  y = reportSectionTitle(commands, "Evidence summary", y, "Evidence status reflects the latest Terumbu review workflow state for records linked to supported projects.") - 8;

  commands.push(pdfRectangleCommand(REPORT_CONTENT_X, y - 24, REPORT_CONTENT_WIDTH, 28, PDF_COLORS.wash, PDF_COLORS.border));
  commands.push(pdfTextCommand({ text: "EVIDENCE", x: 72, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  commands.push(pdfTextCommand({ text: "TITLE", x: 160, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  commands.push(pdfTextCommand({ text: "PROJECT", x: 334, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  commands.push(pdfTextCommand({ text: "STATUS", x: 488, y: y - 7, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  y -= 38;

  evidence.forEach((row, index) => {
    const rowY = y - index * 42;
    const title = wrapPdfText(row.title, 160, 8.3).slice(0, 2);
    const project = wrapPdfText(row.campaignTitle, 140, 7.8).slice(0, 2);
    commands.push(pdfRectangleCommand(REPORT_CONTENT_X, rowY - 27, REPORT_CONTENT_WIDTH, 40, index % 2 === 0 ? PDF_COLORS.white : PDF_COLORS.wash));
    commands.push(pdfTextCommand({ text: row.evidenceCode, x: 72, y: rowY - 6, size: 7.6, font: "bold" }));
    title.forEach((line, lineIndex) => commands.push(pdfTextCommand({ text: line, x: 160, y: rowY - 3 - lineIndex * 10, size: 8.1, font: "bold" })));
    project.forEach((line, lineIndex) => commands.push(pdfTextCommand({ text: line, x: 334, y: rowY - 3 - lineIndex * 10, size: 7.6, color: PDF_COLORS.muted })));
    commands.push(pdfTextCommand({ text: row.verificationStatus.replaceAll("_", " "), x: 488, y: rowY - 6, size: 7.3, font: "bold", color: row.verificationStatus === "verified" ? PDF_COLORS.kelp : PDF_COLORS.coral }));
  });

  if (evidence.length === 0) {
    commands.push(pdfTextCommand({ text: "No linked evidence records were available for this report.", x: REPORT_CONTENT_X, y: y - 24, size: 9.5, color: PDF_COLORS.muted }));
  }

  reportNoteBox(
    commands,
    "Data assurance",
    "This PDF is generated from Terumbu.eco operational records. Evidence labels reflect workflow status, not an external audit opinion. Source records remain available in the platform for traceability.",
    150
  );
  return commands.join("\n");
}

export function buildCorporateActivityReportPdf(input: CorporateActivityReportInput) {
  const activityChunks: CorporateActivityReportRow[][] = [];
  for (let index = 0; index < input.rows.length; index += 13) {
    activityChunks.push(input.rows.slice(index, index + 13));
  }
  if (activityChunks.length === 0) {
    activityChunks.push([]);
  }

  const evidenceRows = input.evidence ?? [];
  const evidenceChunks: CorporateReportArtifactEvidenceRow[][] = [];
  for (let index = 0; index < evidenceRows.length; index += 11) {
    evidenceChunks.push(evidenceRows.slice(index, index + 11));
  }
  const includeEvidencePages = evidenceRows.length > 0;
  const totalPages = 1 + activityChunks.length + (includeEvidencePages ? evidenceChunks.length : 0);
  const period = reportPeriod(input.periodStart, input.periodEnd);
  const cover = brandedReportPage({
    section: "Corporate impact report",
    title: input.title,
    subtitle: `${input.accountName} / ${input.programName}`,
    reportId: input.exportCode,
    generatedAt: input.generatedAt,
    pageNumber: 1,
    totalPages
  });

  cover.push(pdfTextCommand({ text: input.accountName, x: REPORT_CONTENT_X, y: 592, size: 13, font: "bold", color: PDF_COLORS.ocean }));
  cover.push(pdfTextCommand({ text: input.programName, x: REPORT_CONTENT_X, y: 572, size: 9.2, color: PDF_COLORS.muted }));
  cover.push(pdfTextCommand({ text: period, x: REPORT_CONTENT_X, y: 553, size: 8.8, font: "bold", color: PDF_COLORS.muted }));

  const metricWidth = Math.floor((REPORT_CONTENT_WIDTH - 20) / Math.max(1, Math.min(3, input.metrics.length)));
  input.metrics.slice(0, 3).forEach((metric, index) => {
    cover.push(...reportMetricCard(metric.label, metric.value, REPORT_CONTENT_X + index * (metricWidth + 10), 445, metricWidth));
  });

  let y = 410;
  y = reportSectionTitle(
    cover,
    "Report scope",
    y,
    input.title.toLowerCase().includes("donation")
      ? "Summarizes corporate donations recorded in Terumbu, the projects they support, and linked evidence available at generation time."
      : "Summarizes expedition bookings explicitly attributed to this corporate account and the participation recorded in Terumbu."
  ) - 8;
  y = reportSectionTitle(cover, "Reporting basis", y, "The report is generated from platform records for the selected corporate program. Values are shown as recorded; no estimates are introduced by the report generator.") - 10;
  reportNoteBox(
    cover,
    "Terumbu reporting note",
    "The structure prioritizes reporting scope, measurable activity, supporting evidence, and traceability. It is an operational impact report and does not claim compliance with GRI, IFRS Sustainability Disclosure Standards, or independent assurance unless explicitly stated.",
    Math.min(y, 225)
  );

  const pages = [cover.join("\n")];
  activityChunks.forEach((rows, index) => {
    pages.push(activityTablePage(input, rows, pages.length + 1, totalPages, index * 13));
  });
  if (includeEvidencePages) {
    evidenceChunks.forEach((rows) => {
      pages.push(evidenceTablePage(input, rows, pages.length + 1, totalPages));
    });
  }

  return Buffer.from(buildPdfDocumentPages(pages));
}

export function buildCorporateReportPdf(input: CorporateReportArtifactInput) {
  return buildCorporateActivityReportPdf({
    exportCode: input.exportCode,
    title: input.reportTypeLabel,
    accountName: input.accountName,
    programName: input.programName,
    generatedAt: input.generatedAt,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    metrics: input.executiveMetrics.slice(0, 3).map((metric) => ({ label: metric.label, value: metric.value })),
    rows: input.portfolio.map((project) => ({
      title: project.campaignTitle,
      detail: `${project.organizationName ?? "Partner"} / ${project.region}`,
      amount: String(project.allocationValue),
      status: project.statusLabel
    })),
    evidence: input.evidence
  });
}
