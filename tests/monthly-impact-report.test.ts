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
  contributions: 250000,
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
        contribution: 250000,
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
    contribution: 250000,
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
            contribution: 1000,
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
  assert.match(pdfText, /Terumbu\.eco Monthly Impact Report/);
  assert.match(pdfText, /July \\\(Impact\\\)/);
  assert.match(pdfText, /Raka \\\\ Team/);
  assert.match(pdfText, /Campaign \\\(One\\\) Blue/);
  assert.match(pdfText, /IDR\s*250\.000/);
  assert.match(pdfText, /IDR\s*1\.000/);
  assert.match(pdfText, /1 updates \/ 1 evidence/);
  assert.match(pdfText, /dashboard_action/);
  assert.match(pdfText, /https:\/\/example.test\/campaigns\/campaign-one/);
  assert.match(pdfText, /https:\/\/example.test\/dashboard#monthly-report/);
});
