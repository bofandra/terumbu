import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMonthlyImpactReportDownloadHtml,
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
  assert.equal(monthlyImpactReportFilename(report), "terumbu-impact-report-2026-07.html");
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

test("monthly impact report download html escapes unsafe report fields", () => {
  const html = buildMonthlyImpactReportDownloadHtml(
    {
      ...report,
      label: "July <Impact>",
      displayName: "Raka & Team",
      metadata: {
        campaignDigest: [
          {
            title: "Campaign <One>",
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

  assert.match(html, /July &lt;Impact&gt;/);
  assert.match(html, /Raka &amp; Team/);
  assert.match(html, /Campaign &lt;One&gt;/);
  assert.doesNotMatch(html, /<Impact>/);
  assert.match(html, /https:\/\/example.test\/campaigns\/campaign-one/);
});
