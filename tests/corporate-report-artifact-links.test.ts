import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  corporateReportArtifactContentType,
  corporateReportArtifactDisposition,
  corporateReportArtifactFilename,
  corporateReportArtifactLocalPath,
  corporateReportArtifactLocalPaths,
  corporateReportArtifactRoute,
  corporateReportArtifactSourceUrl,
  corporateReportArtifactStorageRoot,
  corporateReportArtifactStorageUrl,
  normalizeCorporateReportArtifactKey,
  publicCorporateReportArtifactRoute
} from "../src/lib/corporate-report-artifact-links";

test("corporate report artifact helpers resolve top-level, manifest, and metadata URLs", () => {
  const report = {
    exportCode: "TRB-ESG-2026-ABCD",
    fileUrl: "/generated/corporate-reports/trb-esg-2026-abcd.json",
    previewUrl: "/generated/corporate-reports/trb-esg-2026-abcd.html",
    evidenceBundleUrl: "/generated/corporate-reports/trb-esg-2026-abcd-evidence.json",
    artifactManifest: {
      manifestUrl: "/generated/corporate-reports/trb-esg-2026-abcd-manifest.json",
      files: [
        { label: "PDF snapshot", format: "pdf", url: "/generated/corporate-reports/trb-esg-2026-abcd.pdf", required: true },
        { label: "Excel workbook", format: "xlsx", url: "/generated/corporate-reports/trb-esg-2026-abcd.xlsx", required: true },
        { label: "Portfolio CSV", format: "csv", url: "/generated/corporate-reports/trb-esg-2026-abcd-portfolio.csv", required: true }
      ]
    },
    metadata: {
      evidenceCsvUrl: "/generated/corporate-reports/trb-esg-2026-abcd-evidence.csv"
    }
  };

  assert.equal(corporateReportArtifactSourceUrl(report, "preview"), report.previewUrl);
  assert.equal(corporateReportArtifactSourceUrl(report, "data"), report.fileUrl);
  assert.equal(corporateReportArtifactSourceUrl(report, "evidence"), report.evidenceBundleUrl);
  assert.equal(corporateReportArtifactSourceUrl(report, "pdf"), "/generated/corporate-reports/trb-esg-2026-abcd.pdf");
  assert.equal(corporateReportArtifactSourceUrl(report, "workbook"), "/generated/corporate-reports/trb-esg-2026-abcd.xlsx");
  assert.equal(corporateReportArtifactSourceUrl(report, "portfolio-csv"), "/generated/corporate-reports/trb-esg-2026-abcd-portfolio.csv");
  assert.equal(corporateReportArtifactSourceUrl(report, "evidence-csv"), "/generated/corporate-reports/trb-esg-2026-abcd-evidence.csv");
  assert.equal(corporateReportArtifactSourceUrl(report, "manifest"), "/generated/corporate-reports/trb-esg-2026-abcd-manifest.json");
});

test("corporate report artifact helpers normalize keys, routes, names, and local paths", () => {
  assert.equal(normalizeCorporateReportArtifactKey("pdf"), "pdf");
  assert.equal(normalizeCorporateReportArtifactKey("zip"), null);
  assert.equal(corporateReportArtifactRoute("report 1", "pdf"), "/corporate/reports/report%201/artifact/pdf");
  assert.equal(publicCorporateReportArtifactRoute("public report", "pdf"), "/corporate-impact/public%20report/artifact/pdf");
  assert.equal(corporateReportArtifactFilename("TRB/ESG 2026 ABCD", "workbook"), "trb-esg-2026-abcd-workbook.xlsx");
  assert.equal(corporateReportArtifactContentType("pdf"), "application/pdf");
  assert.equal(corporateReportArtifactDisposition("TRB-ESG-2026-ABCD", "preview"), "inline; filename=\"trb-esg-2026-abcd-preview.html\"");

  const storageUrl = corporateReportArtifactStorageUrl("trb-esg-2026-abcd.pdf");
  assert.equal(storageUrl, "private://corporate-reports/trb-esg-2026-abcd.pdf");
  assert.equal(corporateReportArtifactStorageRoot(), path.join(process.cwd(), "data", "corporate-reports"));

  const privatePath = corporateReportArtifactLocalPath(storageUrl);
  assert.equal(privatePath, path.join(process.cwd(), "data", "corporate-reports", "trb-esg-2026-abcd.pdf"));

  const legacyPaths = corporateReportArtifactLocalPaths("/generated/corporate-reports/trb-esg-2026-abcd.pdf");
  assert.deepEqual(legacyPaths, [
    path.join(process.cwd(), "data", "corporate-reports", "trb-esg-2026-abcd.pdf"),
    path.join(process.cwd(), "public", "generated", "corporate-reports", "trb-esg-2026-abcd.pdf")
  ]);

  assert.equal(corporateReportArtifactLocalPath("https://example.test/report.pdf"), null);
  assert.equal(corporateReportArtifactLocalPath("/generated/corporate-reports/../../secret.env"), null);
  assert.equal(corporateReportArtifactLocalPath("private://corporate-reports/..%2Fsecret.env"), null);
  assert.throws(() => corporateReportArtifactStorageUrl("../secret.env"), /Invalid corporate report artifact filename/);
});
