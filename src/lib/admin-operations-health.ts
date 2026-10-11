import type { HourlyWorkerName, WorkerHealth } from "@/lib/worker-heartbeat";

export type AdminWorkerMetrics = {
  name: HourlyWorkerName;
  health: WorkerHealth;
  consecutiveFailures: number;
  lastStartedAt: Date | null;
  lastFinishedAt: Date | null;
  lastSucceededAt: Date | null;
  lastFailedAt: Date | null;
};

export type AdminOperationsMetrics = {
  workers: AdminWorkerMetrics[];
  checkedAt: Date;
  reports: {
    scheduled: number;
    due: number;
    overdue: number;
    retrying: number;
    lastScheduledGenerationAt: Date | null;
  };
  emails: {
    queued: number;
    sending: number;
    retry: number;
    failed: number;
    accepted: number;
    delivered: number;
    deliveryIssues: number;
    staleQueued: number;
    expiredClaims: number;
    lastProviderEventAt: Date | null;
  };
  webhook: {
    pending: number;
    stalePending: number;
    lastReceivedAt: Date | null;
  };
};

export type AdminOperationsAlert = {
  key: string;
  label: string;
  count: number;
  detail: string;
};

/** Only flag actionable outliers, not normal queued/scheduled work. */
export function adminOperationsAlerts(metrics: AdminOperationsMetrics): AdminOperationsAlert[] {
  const alerts: AdminOperationsAlert[] = [];
  function add(key: string, label: string, count: number, detail: string) {
    if (Number.isSafeInteger(count) && count > 0) alerts.push({ key, label, count, detail });
  }
  for (const worker of metrics.workers) {
    const name = worker.name === "corporate_reports" ? "Corporate reports" : "Expedition reminders";
    if (worker.health === "not_observed") {
      add(worker.name + "-unobserved", name + ": no heartbeat recorded", 1,
        "No authenticated worker execution has been recorded yet. Verify the scheduler after deployment.");
    } else if (worker.health === "stale") {
      add(worker.name + "-stale", name + ": missed heartbeat", 1,
        "No new worker invocation for more than 150 minutes. Check the container and scheduler logs.");
    } else if (worker.health === "failing") {
      add(worker.name + "-failing", name + ": repeated failures", worker.consecutiveFailures,
        "Two or more consecutive worker cycles failed. Review dependencies and the last recorded failure.");
    }
  }
  add("overdue-reports", "Overdue scheduled PDFs", metrics.reports.overdue,
    "Scheduled at least 2 hours ago and not generated.");
  add("report-retries", "Reports with prior failures", metrics.reports.retrying,
    "Scheduled reports recording failed generation attempts, including those waiting for retry.");
  add("email-failures", "Failed alert emails", metrics.emails.failed,
    "Outbox jobs that exhausted retries or failed before provider acceptance.");
  add("delivery-problems", "Provider delivery problems", metrics.emails.deliveryIssues,
    "Bounced, complained, failed or suppressed messages; never retry automatically.");
  add("stale-emails", "Queued emails over 2 hours", metrics.emails.staleQueued,
    "Queued or retrying alerts that have not progressed in the past 2 hours.");
  add("expired-email-leases", "Expired sending leases", metrics.emails.expiredClaims,
    "Email outbox jobs whose sending lease has expired.");
  add("unreconciled-events", "Unreconciled webhook events over 2 hours", metrics.webhook.stalePending,
    "Signed events for known corporate alert messages that remain unapplied.");
  return alerts;
}
