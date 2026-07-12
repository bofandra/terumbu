import type { EvidenceSourceData } from "@/lib/domain";

function evidenceTimestamp(evidence: Pick<EvidenceSourceData, "surveyDate" | "verifiedAt" | "createdAt">) {
  const surveyTimestamp = evidence.surveyDate ? Date.parse(`${evidence.surveyDate}T00:00:00.000Z`) : Number.NaN;

  if (Number.isFinite(surveyTimestamp)) {
    return surveyTimestamp;
  }

  return evidence.verifiedAt?.getTime() ?? evidence.createdAt.getTime();
}

export function sortEvidenceByObservationDate<T extends Pick<EvidenceSourceData, "surveyDate" | "verifiedAt" | "createdAt">>(evidence: T[]) {
  return [...evidence].sort((left, right) => evidenceTimestamp(right) - evidenceTimestamp(left));
}

export function isVisualEvidenceUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  if (value.startsWith("data:image/")) {
    return true;
  }

  if (/\.(jpg|jpeg|png|webp|gif)(\?|#|$)/i.test(value)) {
    return true;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    return host === "images.unsplash.com" || host.endsWith(".cloudinary.com") || host.endsWith(".imgix.net");
  } catch {
    return false;
  }
}

export function buildMonitoringHistory(evidence: EvidenceSourceData[], limit = 6) {
  return sortEvidenceByObservationDate(evidence)
    .filter((item) => ["before", "after", "monitoring", "survey"].includes(item.stage))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      label: item.stageLabel,
      date: item.surveyDate ?? item.createdAt.toISOString().slice(0, 10),
      status: item.verificationStatus,
      summary: item.observation ?? item.title,
      evidenceHref: item.sourceHref
    }));
}

export function buildCoralEvidenceStream(evidence: EvidenceSourceData[]) {
  const sortedEvidence = sortEvidenceByObservationDate(evidence);
  const before = sortedEvidence.find((item) => item.stage === "before") ?? null;
  const after =
    sortedEvidence.find((item) => item.stage === "after") ??
    sortedEvidence.find((item) => item.stage === "monitoring") ??
    sortedEvidence.find((item) => item.stage === "survey") ??
    null;

  return {
    evidence: sortedEvidence,
    mediaGallery: sortedEvidence.filter((item) => isVisualEvidenceUrl(item.fileUrl)).slice(0, 6),
    latestEvidence: sortedEvidence[0] ?? null,
    latestSurvey: sortedEvidence[0]?.surveyDate ?? null,
    beforeAfter: before || after ? { before, after } : null,
    monitoringHistory: buildMonitoringHistory(sortedEvidence),
    verifiedEvidenceCount: sortedEvidence.filter((item) => item.verificationStatus === "verified").length,
    pendingEvidenceCount: sortedEvidence.filter((item) => item.verificationStatus !== "verified").length
  };
}
