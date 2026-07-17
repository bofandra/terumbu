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
  executiveMetrics: CorporateReportArtifactMetric[];
  financials: Record<string, number>;
  impactOutputs: Record<string, number>;
  portfolio: CorporateReportArtifactPortfolioRow[];
  evidence: CorporateReportArtifactEvidenceRow[];
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
        ["Project", "Partner", "Region", "Allocation", "Utilization %", "Status"],
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

function pdfSafe(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[\\()]/g, (match) => `\\${match}`);
}

function wrapLine(value: string, width = 92) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (`${current} ${word}`.trim().length > width) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

export function buildCorporateReportPdf(input: CorporateReportArtifactInput) {
  const lines = [
    `${input.reportTypeLabel} - ${input.exportCode}`,
    `${input.accountName} / ${input.programName}`,
    `Generated ${input.generatedAt.toISOString()}`,
    "",
    "Executive metrics",
    ...input.executiveMetrics.flatMap((metric) => wrapLine(`${metric.label}: ${metric.value}${metric.support ? ` (${metric.support})` : ""}`)),
    "",
    "Project portfolio",
    ...input.portfolio.slice(0, 20).flatMap((project) => wrapLine(`${project.campaignTitle} - ${project.region} - ${project.statusLabel} - allocation ${project.allocationValue}`)),
    "",
    "Evidence bundle",
    ...input.evidence.slice(0, 30).flatMap((evidence) => wrapLine(`${evidence.evidenceCode}: ${evidence.title} - ${evidence.verificationStatus}`))
  ];
  const pageLines = lines.slice(0, 58);
  const content = [
    "BT",
    "/F1 10 Tf",
    "50 790 Td",
    ...pageLines.map((line, index) => `${index === 0 ? "" : "0 -13 Td "}${index === 0 ? "" : ""}(${pdfSafe(line)}) Tj`),
    "ET"
  ].join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj\n`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "ascii");
}
