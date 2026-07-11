export const expeditionReviewStatuses = ["pending", "published", "rejected"] as const;

export type ExpeditionReviewStatus = (typeof expeditionReviewStatuses)[number];

export const expeditionReviewStatusLabels: Record<ExpeditionReviewStatus, string> = {
  pending: "Pending review",
  published: "Approved",
  rejected: "Rejected"
};

export function normalizeExpeditionReviewStatus(value: unknown, fallback: ExpeditionReviewStatus = "pending"): ExpeditionReviewStatus {
  const status = String(value ?? "").trim().toLowerCase();

  if (status === "approved") {
    return "published";
  }

  return expeditionReviewStatuses.includes(status as ExpeditionReviewStatus) ? (status as ExpeditionReviewStatus) : fallback;
}

export function expeditionReviewStatusLabel(value: unknown) {
  return expeditionReviewStatusLabels[normalizeExpeditionReviewStatus(value)];
}

export function safeAdminExpeditionReturnPath(value: unknown) {
  const fallback = "/admin/expeditions";
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw) {
    return fallback;
  }

  try {
    const url = new URL(raw, "http://terumbu.local");

    if (url.origin !== "http://terumbu.local") {
      return fallback;
    }

    if (url.pathname !== "/admin/expeditions" && !url.pathname.startsWith("/admin/expeditions/")) {
      return fallback;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}
