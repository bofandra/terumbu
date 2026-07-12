import assert from "node:assert/strict";
import test from "node:test";

import { buildCoralEvidenceStream, buildMonitoringHistory, isVisualEvidenceUrl } from "../src/lib/coral-monitoring";
import type { EvidenceSourceData } from "../src/lib/domain";

function evidence(overrides: Partial<EvidenceSourceData> & Pick<EvidenceSourceData, "id" | "code" | "stage" | "stageLabel" | "surveyDate" | "verificationStatus" | "fileUrl">): EvidenceSourceData {
  return {
    title: overrides.title ?? `${overrides.stageLabel} record`,
    evidenceType: overrides.evidenceType ?? "field_photo",
    observation: overrides.observation ?? null,
    metricLabel: overrides.metricLabel ?? null,
    metricValue: overrides.metricValue ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-05-01T00:00:00.000Z"),
    verifiedAt: overrides.verifiedAt ?? null,
    sourceHref: overrides.sourceHref ?? `/campaigns/demo#${overrides.code}`,
    ...overrides
  };
}

test("coral monitoring stream sorts evidence by survey date and summarizes verification state", () => {
  const stream = buildCoralEvidenceStream([
    evidence({
      id: "before",
      code: "EVD-001",
      stage: "before",
      stageLabel: "Before",
      surveyDate: "2026-05-20",
      verificationStatus: "verified",
      fileUrl: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1200&q=80"
    }),
    evidence({
      id: "monitoring",
      code: "EVD-002",
      stage: "monitoring",
      stageLabel: "Monitoring",
      surveyDate: "2026-06-12",
      verificationStatus: "in_review",
      fileUrl: "https://example.com/audit.pdf",
      observation: "Tagged coral cohort checked during the June monitoring visit."
    }),
    evidence({
      id: "report",
      code: "EVD-003",
      stage: "report",
      stageLabel: "Report",
      surveyDate: "2026-06-01",
      verificationStatus: "verified",
      fileUrl: "https://example.com/photo.png"
    })
  ]);

  assert.equal(stream.latestEvidence?.id, "monitoring");
  assert.equal(stream.latestSurvey, "2026-06-12");
  assert.equal(stream.beforeAfter?.before?.id, "before");
  assert.equal(stream.beforeAfter?.after?.id, "monitoring");
  assert.equal(stream.verifiedEvidenceCount, 2);
  assert.equal(stream.pendingEvidenceCount, 1);
  assert.deepEqual(stream.mediaGallery.map((item) => item.id), ["report", "before"]);
  assert.deepEqual(stream.monitoringHistory.map((item) => item.id), ["monitoring", "before"]);
});

test("visual evidence detection supports CDN-style images and excludes documents", () => {
  assert.equal(isVisualEvidenceUrl("https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1200&q=80"), true);
  assert.equal(isVisualEvidenceUrl("https://cdn.example.com/evidence/photo.webp?signature=1"), true);
  assert.equal(isVisualEvidenceUrl("data:image/png;base64,abc"), true);
  assert.equal(isVisualEvidenceUrl("https://example.com/evidence/report.pdf"), false);
});

test("monitoring history excludes report-only records and respects the requested limit", () => {
  const history = buildMonitoringHistory(
    [
      evidence({ id: "a", code: "A", stage: "before", stageLabel: "Before", surveyDate: "2026-01-01", verificationStatus: "verified", fileUrl: "a.jpg" }),
      evidence({ id: "b", code: "B", stage: "report", stageLabel: "Report", surveyDate: "2026-02-01", verificationStatus: "verified", fileUrl: "b.pdf" }),
      evidence({ id: "c", code: "C", stage: "survey", stageLabel: "Survey", surveyDate: "2026-03-01", verificationStatus: "verified", fileUrl: "c.jpg" })
    ],
    1
  );

  assert.deepEqual(history.map((item) => item.id), ["c"]);
});
