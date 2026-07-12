import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCorporateReportArtifactManifest,
  corporateReportFormatLabel,
  corporateReportTypeLabel,
  normalizeCorporateReportFormat,
  normalizeCorporateReportStatus,
  normalizeCorporateReportType,
  scheduledReportIsDue
} from "../src/lib/corporate-report-lifecycle";

test("corporate report lifecycle values normalize defensively", () => {
  assert.equal(normalizeCorporateReportType("csr"), "csr");
  assert.equal(normalizeCorporateReportType("unexpected"), "esg");
  assert.equal(normalizeCorporateReportFormat("full_archive"), "full_archive");
  assert.equal(normalizeCorporateReportFormat("pdf"), "html_json");
  assert.equal(normalizeCorporateReportStatus("published"), "published");
  assert.equal(normalizeCorporateReportStatus("queued"), "generated");
  assert.equal(corporateReportTypeLabel("evidence"), "Evidence Bundle");
  assert.equal(corporateReportFormatLabel("evidence_json"), "Evidence JSON");
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
      { label: "Evidence", format: "json", url: "/evidence.json", required: true }
    ]
  });

  assert.equal(manifest.readiness, "ready");
  assert.equal(manifest.fileCount, 3);
  assert.equal(manifest.artifactVersion, 2);
  assert.equal(manifest.reportTypeLabel, "ESG Report");
});
