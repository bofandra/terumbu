import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCorporateActivityReportPdf,
  buildCorporateReportPdf,
  buildCorporateReportWorkbookXlsx,
  corporateReportEvidenceCsv,
  corporateReportPortfolioCsv,
  type CorporateActivityReportInput,
  type CorporateReportArtifactInput
} from "../src/lib/corporate-report-artifacts";
import {
  buildCorporateReportArtifactManifest,
  corporateReportFormatLabel,
  corporateReportTypeLabel,
  normalizeCorporateReportFormat,
  normalizeCorporateReportStatus,
  normalizeCorporateReportType,
  scheduledReportIsDue
} from "../src/lib/corporate-report-lifecycle";

const artifactInput: CorporateReportArtifactInput = {
  exportCode: "TRB-ESG-2026-ABCD",
  reportTypeLabel: "ESG Report",
  accountName: "Blue Carbon Co",
  programName: "Ocean Restoration 2026",
  generatedAt: new Date("2026-07-12T00:00:00Z"),
  executiveMetrics: [
    { label: "Total committed funding", value: "USD 1.000,00", support: "Across 2 projects" },
    { label: "Verified evidence", value: "3", support: "Field records" }
  ],
  financials: {
    committedFunding: 1000,
    fundsDisbursed: 500
  },
  impactOutputs: {
    restorationUnits: 1200,
    verifiedOutputs: 3
  },
  portfolio: [
    {
      campaignTitle: "Restore Reef (North)",
      organizationName: "Marine Partner",
      region: "Raja Ampat",
      allocationValue: 250000,
      utilization: 80,
      statusLabel: "On Track"
    }
  ],
  evidence: [
    {
      evidenceCode: "EV-001",
      title: "Field survey <verified>",
      evidenceType: "photo",
      verificationStatus: "verified",
      campaignTitle: "Restore Reef (North)",
      sourceHref: "/campaigns/restore/evidence/EV-001"
    }
  ]
};

test("corporate report lifecycle values normalize defensively", () => {
  assert.equal(normalizeCorporateReportType("csr"), "csr");
  assert.equal(normalizeCorporateReportType("donations"), "donations");
  assert.equal(normalizeCorporateReportType("expeditions"), "expeditions");
  assert.equal(normalizeCorporateReportType("unexpected"), "esg");
  assert.equal(normalizeCorporateReportFormat("full_archive"), "full_archive");
  assert.equal(normalizeCorporateReportFormat("pdf"), "pdf");
  assert.equal(normalizeCorporateReportStatus("published"), "published");
  assert.equal(normalizeCorporateReportStatus("queued"), "generated");
  assert.equal(corporateReportTypeLabel("evidence"), "Evidence Bundle");
  assert.equal(corporateReportTypeLabel("donations"), "Donation Activity Report");
  assert.equal(corporateReportTypeLabel("expeditions"), "Expedition Activity Report");
  assert.equal(corporateReportFormatLabel("evidence_json"), "Evidence JSON");
  assert.equal(corporateReportFormatLabel("pdf"), "PDF");
});

test("scheduled corporate reports are due only at or after their scheduled time", () => {
  const now = new Date("2026-07-12T00:00:00Z");

  assert.equal(scheduledReportIsDue(null, now), false);
  assert.equal(scheduledReportIsDue(new Date("2026-07-13T00:00:00Z"), now), false);
  assert.equal(scheduledReportIsDue(new Date("2026-07-11T00:00:00Z"), now), true);
});

test("corporate report artifact manifest tracks readiness and files", () => {
  const manifest = buildCorporateReportArtifactManifest({
    exportCode: "TRB-ESG-2026-ABCD",
    reportType: "esg",
    exportFormat: "full_archive",
    artifactVersion: 2,
    generatedAt: new Date("2026-07-12T00:00:00Z"),
    files: [
      { label: "Preview", format: "html", url: "/report.html", required: true },
      { label: "Data", format: "json", url: "/report.json", required: true },
      { label: "Evidence", format: "json", url: "/evidence.json", required: true },
      { label: "PDF snapshot", format: "pdf", url: "/report.pdf", required: true },
      { label: "Excel workbook", format: "xlsx", url: "/report.xlsx", required: true }
    ]
  });

  assert.equal(manifest.readiness, "ready");
  assert.equal(manifest.fileCount, 5);
  assert.equal(manifest.artifactVersion, 2);
  assert.equal(manifest.reportTypeLabel, "ESG Report");
});

test("corporate report binary artifacts produce portable PDF, XLSX, and CSV files", () => {
  const pdf = buildCorporateReportPdf(artifactInput);
  const xlsx = buildCorporateReportWorkbookXlsx(artifactInput);
  const portfolioCsv = corporateReportPortfolioCsv(artifactInput);
  const evidenceCsv = corporateReportEvidenceCsv(artifactInput);

  assert.equal(pdf.subarray(0, 8).toString("ascii"), "%PDF-1.4");
  assert.match(pdf.toString("ascii"), /Restore Reef \\\(North\\\)/);
  assert.equal(xlsx.subarray(0, 2).toString("ascii"), "PK");
  assert.match(xlsx.toString("utf8"), /xl\/worksheets\/sheet1\.xml/);
  assert.match(xlsx.toString("utf8"), /Field survey &lt;verified&gt;/);
  assert.match(portfolioCsv, /"Restore Reef \(North\)","Marine Partner","Raja Ampat"/);
  assert.match(evidenceCsv, /"EV-001","Field survey <verified>"/);
});


test("corporate activity report PDF is a simple portable activity report", () => {
  const input: CorporateActivityReportInput = {
    exportCode: "TRB-DON-2026-ABCD",
    title: "Donation Activity Report",
    accountName: "Blue Carbon Co",
    programName: "Ocean Restoration 2026",
    generatedAt: new Date("2026-07-12T00:00:00Z"),
    metrics: [
      { label: "Donations", value: "USD 1,000" },
      { label: "Projects", value: "2" }
    ],
    rows: [
      {
        title: "Restore Reef North",
        detail: "Donation reference",
        amount: "USD 500",
        status: "Committed",
        occurredAt: new Date("2026-07-12T00:00:00Z")
      }
    ]
  };

  const pdf = buildCorporateActivityReportPdf(input);

  assert.equal(pdf.subarray(0, 8).toString("ascii"), "%PDF-1.4");
  assert.match(pdf.toString("ascii"), /Donation Activity Report/);
  assert.match(pdf.toString("ascii"), /Restore Reef North/);
});
