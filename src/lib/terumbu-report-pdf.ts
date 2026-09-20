import { PDF_COLORS, PDF_PAGE_HEIGHT, PDF_PAGE_WIDTH, pdfRectangleCommand, pdfTextCommand, wrapPdfText } from "@/lib/pdf-document";

export const REPORT_CONTENT_X = 64;
export const REPORT_CONTENT_WIDTH = PDF_PAGE_WIDTH - REPORT_CONTENT_X * 2;

type BrandedReportPageOptions = {
  section: string;
  title: string;
  subtitle: string;
  reportId: string;
  generatedAt: Date;
  pageNumber: number;
  totalPages: number;
  compactHeader?: boolean;
};

function reportDate(value: Date | null | undefined) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : "Not recorded";
}

export function reportPeriod(periodStart?: Date | null, periodEnd?: Date | null) {
  if (periodStart && periodEnd) {
    return `Period: ${reportDate(periodStart)} to ${reportDate(periodEnd)}`;
  }

  if (periodStart) {
    return `Period from ${reportDate(periodStart)}`;
  }

  if (periodEnd) {
    return `Period through ${reportDate(periodEnd)}`;
  }

  return "Period: all available records";
}

export function brandedReportPage({
  section,
  title,
  subtitle,
  reportId,
  generatedAt,
  pageNumber,
  totalPages,
  compactHeader = false
}: BrandedReportPageOptions) {
  const commands = [
    pdfRectangleCommand(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT, PDF_COLORS.sand),
    pdfRectangleCommand(48, 48, 499, 746, PDF_COLORS.white, PDF_COLORS.border),
    pdfRectangleCommand(48, 770, 499, 24, PDF_COLORS.ocean),
    pdfTextCommand({ text: "Terumbu.eco", x: REPORT_CONTENT_X, y: 777, size: 10, font: "bold", color: PDF_COLORS.white }),
    pdfTextCommand({ text: section, x: REPORT_CONTENT_X, y: compactHeader ? 736 : 724, size: 10.5, font: "bold", color: PDF_COLORS.coral }),
    pdfTextCommand({ text: title, x: REPORT_CONTENT_X, y: compactHeader ? 708 : 684, size: compactHeader ? 21 : 28, font: "bold", color: PDF_COLORS.ocean })
  ];

  wrapPdfText(subtitle, REPORT_CONTENT_WIDTH - 160, 10).slice(0, 2).forEach((line, index) => {
    commands.push(pdfTextCommand({ text: line, x: REPORT_CONTENT_X, y: (compactHeader ? 686 : 652) - index * 13, size: 10, font: "bold", color: PDF_COLORS.kelp }));
  });

  commands.push(
    pdfRectangleCommand(REPORT_CONTENT_X, compactHeader ? 648 : 612, REPORT_CONTENT_WIDTH, 34, PDF_COLORS.wash, PDF_COLORS.border),
    pdfTextCommand({ text: `Report ID: ${reportId}`, x: REPORT_CONTENT_X + 14, y: compactHeader ? 661 : 625, size: 8.5, font: "bold", color: PDF_COLORS.ocean }),
    pdfTextCommand({ text: `Generated: ${reportDate(generatedAt)}`, x: 328, y: compactHeader ? 661 : 625, size: 8.5, font: "bold", color: PDF_COLORS.muted }),
    pdfTextCommand({ text: "Data assurance: generated from Terumbu.eco source records.", x: REPORT_CONTENT_X, y: 74, size: 7.8, color: PDF_COLORS.muted }),
    pdfTextCommand({ text: `Page ${pageNumber} / ${totalPages}`, x: 485, y: 74, size: 7.8, font: "bold", color: PDF_COLORS.muted })
  );

  return commands;
}

export function reportMetricCard(label: string, value: string, x: number, y: number, width: number) {
  const valueLines = wrapPdfText(value, width - 24, 15).slice(0, 2);
  const labelLines = wrapPdfText(label, width - 24, 7.8).slice(0, 2);
  const commands = [
    pdfRectangleCommand(x, y - 64, width, 64, PDF_COLORS.wash, PDF_COLORS.border),
    pdfRectangleCommand(x, y - 64, 4, 64, PDF_COLORS.kelp)
  ];

  valueLines.forEach((line, index) => {
    commands.push(pdfTextCommand({ text: line, x: x + 14, y: y - 24 - index * 15, size: 14.5, font: "bold", color: PDF_COLORS.ocean }));
  });

  labelLines.forEach((line, index) => {
    commands.push(pdfTextCommand({ text: line, x: x + 14, y: y - 47 - index * 10, size: 7.8, font: "bold", color: PDF_COLORS.muted }));
  });

  return commands;
}

export function reportSectionTitle(commands: string[], title: string, y: number, body?: string | null) {
  commands.push(pdfTextCommand({ text: title, x: REPORT_CONTENT_X, y, size: 13, font: "bold", color: PDF_COLORS.ocean }));

  const bodyLines = body ? wrapPdfText(body, REPORT_CONTENT_WIDTH, 8.8).slice(0, 4) : [];
  bodyLines.forEach((line, index) => {
    commands.push(pdfTextCommand({ text: line, x: REPORT_CONTENT_X, y: y - 17 - index * 11, size: 8.8, color: PDF_COLORS.muted }));
  });

  return y - 28 - bodyLines.length * 11;
}

export function reportNoteBox(commands: string[], title: string, body: string, y: number) {
  const bodyLines = wrapPdfText(body, REPORT_CONTENT_WIDTH - 32, 8.6).slice(0, 5);
  const height = 42 + bodyLines.length * 11;

  commands.push(
    pdfRectangleCommand(REPORT_CONTENT_X, y - height, REPORT_CONTENT_WIDTH, height, PDF_COLORS.seal, PDF_COLORS.border),
    pdfTextCommand({ text: title, x: REPORT_CONTENT_X + 16, y: y - 20, size: 10, font: "bold", color: PDF_COLORS.ocean })
  );

  bodyLines.forEach((line, index) => {
    commands.push(pdfTextCommand({ text: line, x: REPORT_CONTENT_X + 16, y: y - 38 - index * 11, size: 8.6, color: PDF_COLORS.ocean }));
  });

  return y - height - 12;
}
