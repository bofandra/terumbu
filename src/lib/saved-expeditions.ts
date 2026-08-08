export const savedExpeditionStatuses = ["active", "removed"] as const;

export type SavedExpeditionStatus = (typeof savedExpeditionStatuses)[number];

export function normalizeSavedExpeditionStatus(value: unknown, fallback: SavedExpeditionStatus = "removed"): SavedExpeditionStatus {
  const status = String(value ?? "").trim().toLowerCase();

  return savedExpeditionStatuses.includes(status as SavedExpeditionStatus) ? (status as SavedExpeditionStatus) : fallback;
}
