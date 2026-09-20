const DEFAULT_ADMIN_QUERY_WARN_MS = 750;
const MIN_ADMIN_QUERY_WARN_MS = 50;
const MAX_ADMIN_QUERY_WARN_MS = 60_000;

export function adminQueryWarnThresholdMs(rawValue = process.env.ADMIN_QUERY_WARN_MS) {
  if (!rawValue) {
    return DEFAULT_ADMIN_QUERY_WARN_MS;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ADMIN_QUERY_WARN_MS;
  }

  return Math.min(MAX_ADMIN_QUERY_WARN_MS, Math.max(MIN_ADMIN_QUERY_WARN_MS, Math.round(parsed)));
}

export function shouldWarnAdminQuery(durationMs: number, thresholdMs = adminQueryWarnThresholdMs()) {
  return Number.isFinite(durationMs) && durationMs >= thresholdMs;
}

export async function observeAdminDataLoader<T>(operation: string, task: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  let outcome: "ok" | "error" = "ok";

  try {
    return await task();
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    const durationMs = performance.now() - startedAt;
    const thresholdMs = adminQueryWarnThresholdMs();

    if (shouldWarnAdminQuery(durationMs, thresholdMs)) {
      console.warn(
        JSON.stringify({
          event: "admin_data_loader_slow",
          operation,
          outcome,
          durationMs: Math.round(durationMs),
          thresholdMs
        })
      );
    }
  }
}
