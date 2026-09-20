import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMonthlyImpactReportDownloadPdf,
  monthlyImpactReportDigest,
  monthlyImpactReportFilename,
  monthlyImpactReportHolderName,
  type MonthlyImpactReportRecord
} from "../src/lib/monthly-impact-report";

const report: MonthlyImpactReportRecord = {
  id: "report-1",
  reportMonth: "2026-07",
  label: "July 2026 Impact Report",
  contributions: 250,
  campaignUpdates: 3,
  newEvidence: 2,
  coralsMonitored: 42,
  academyProgress: 1,
  generatedAt: new Date("2026-07-14T00:00:00.000Z"),
  metadata: {
    generatedBy: "admin_run",
    followedCampaignCount: 2,
    campaignCount: 3,
    campaignDigest: [
      {
        title: "Reef Recovery",
        slug: "reef-recovery",
        contribution: 250,
        updateCount: 2,
        evidenceCount: 1
      }
    ]
  },
  userName: "Raka Demo",
  displayName: "Raka Pramana",
  userEmail: "raka@example.test"
};

test("monthly impact report helpers produce stable labels and digest data", () => {
  assert.equal(monthlyImpactReportFilename(report), "terumbu-impact-report-2026-07.pdf");
  assert.equal(monthlyImpactReportHolderName(report), "Raka Pramana");

  const digest = monthlyImpactReportDigest(report.metadata);

  assert.equal(digest.generatedBy, "admin_run");
  assert.equal(digest.followedCampaignCount, 2);
  assert.equal(digest.campaignCount, 3);
  assert.deepEqual(digest.campaignDigest[0], {
    title: "Reef Recovery",
    slug: "reef-recovery",
    contribution: 250,
    updateCount: 2,
    evidenceCount: 1
  });
});

test("monthly impact report download pdf includes report details", () => {
  const pdf = buildMonthlyImpactReportDownloadPdf(
    {
      ...report,
      label: "July (Impact)",
      displayName: "Raka \\ Team",
      metadata: {
        generatedBy: "dashboard_action",
        followedCampaignCount: 1,
        campaignDigest: [
          {
            title: "Campaign (One)\nBlue",
            slug: "campaign-one",
            contribution: 1,
            updateCount: 1,
            evidenceCount: 1
          }
        ]
      }
    },
    "https://example.test"
  );
  const pdfText = Buffer.from(pdf).toString("latin1");

  assert.match(pdfText, /^%PDF-1\.4/);
  assert.match(pdfText, /Terumbu\.eco/);
  assert.match(pdfText, /Personal impact report/);
  assert.match(pdfText, /July/);
  assert.match(pdfText, /Raka/);
  assert.match(pdfText, /Executive|Monthly summary/);
  assert.match(pdfText, /Project activity/);
  assert.match(pdfText, /Campaign/);
  assert.match(pdfText, /Blue/);
  assert.match(pdfText, /USD\s*250/);
  assert.match(pdfText, /USD\s*1/);
  assert.match(pdfText, /Traceability/);
  assert.match(pdfText, /\/Count 2/);
});
