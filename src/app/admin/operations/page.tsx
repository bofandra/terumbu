import { Activity, AlertTriangle, Clock3, FileText, Mail, RadioTower, TimerReset } from "lucide-react";

import { AdminPageHeader } from "@/components/admin-ui";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { adminOperationsAlerts } from "@/lib/admin-operations-health";
import { getAdminOperationsMetrics } from "@/lib/admin-operations";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Admin Operations" };
export const dynamic = "force-dynamic";

function Metric({ label, value, help }: { label: string; value: number; help: string }) {
  return (
    <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/60">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-ocean-900">{value.toLocaleString("id-ID")}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-ocean-900/55">{help}</p>
    </div>
  );
}

function when(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta"
    }).format(value)
    : "No matching event recorded";
}

export default async function AdminOperationsPage() {
  // The layout is also guarded; repeat authorization before all data queries.
  await requireRole(["admin"], "/admin/operations");
  const metrics = await observeAdminDataLoader("admin.operations", () => getAdminOperationsMetrics());
  const alerts = adminOperationsAlerts(metrics);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operations"
        title="Operational health"
        description="Platform-wide database snapshot for corporate PDF scheduling, alert email delivery, and Resend webhook reconciliation."
      />

      <section aria-label="Operations attention" className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          {alerts.length ? <AlertTriangle aria-hidden="true" className="size-5 text-coral-700" /> : <Activity aria-hidden="true" className="size-5 text-kelp-700" />}
          <div>
            <h2 className="text-lg font-bold text-ocean-900">
              {alerts.length ? "Operations requiring attention" : "No threshold alerts in this snapshot"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/60">
              {alerts.length ? alerts.length + " category(s) exceed the review thresholds." : "An empty alert list does not prove the scheduled worker or Resend webhook is configured."}
            </p>
          </div>
        </div>
        {alerts.length ? (
          <ul data-testid="operations-alerts" className="mt-4 grid gap-3">
            {alerts.map((alert) => (
              <li key={alert.key} className="rounded-lg border border-coral-700/15 bg-coral-100/50 p-3">
                <p className="text-sm font-bold text-ocean-900">{alert.label}: {alert.count.toLocaleString("id-ID")}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/65">{alert.detail}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="operations-workers" className="space-y-3">
        <div className="flex items-center gap-2">
          <TimerReset aria-hidden="true" className="size-5 text-ocean-700" />
          <h2 id="operations-workers" className="text-lg font-bold text-ocean-900">Hourly worker heartbeats</h2>
        </div>
        <p className="text-sm font-semibold text-ocean-900/60">An authenticated run records its start and finish in the database. A missed heartbeat is detected after 150 minutes; two consecutive failed runs trigger an alert.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {metrics.workers.map((worker) => (
            <article key={worker.name} data-testid={`worker-heartbeat-${worker.name}`} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <h3 className="font-bold text-ocean-900">{worker.name === "corporate_reports" ? "Corporate report scheduler" : "Expedition reminder scheduler"}</h3>
              <p className="mt-2 text-sm font-bold capitalize text-ocean-900">Status: {worker.health.replaceAll("_", " ")}</p>
              <dl className="mt-3 grid gap-2 text-xs font-semibold text-ocean-900/60">
                <div><dt className="inline font-bold">Last started (WIB): </dt><dd className="inline">{when(worker.lastStartedAt)}</dd></div>
                <div><dt className="inline font-bold">Last finished (WIB): </dt><dd className="inline">{when(worker.lastFinishedAt)}</dd></div>
                <div><dt className="inline font-bold">Last success (WIB): </dt><dd className="inline">{when(worker.lastSucceededAt)}</dd></div>
                <div><dt className="inline font-bold">Last failure (WIB): </dt><dd className="inline">{when(worker.lastFailedAt)}</dd></div>
                <div><dt className="inline font-bold">Consecutive failed runs: </dt><dd className="inline">{worker.consecutiveFailures}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="operations-reports" className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText aria-hidden="true" className="size-5 text-ocean-700" />
          <h2 id="operations-reports" className="text-lg font-bold text-ocean-900">Scheduled corporate reports</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Scheduled" value={metrics.reports.scheduled} help="Awaiting a future generation or retry." />
          <Metric label="Due" value={metrics.reports.due} help="Scheduled for now or earlier." />
          <Metric label="Overdue 2h+" value={metrics.reports.overdue} help="Not generated two hours after due time." />
          <Metric label="With failures" value={metrics.reports.retrying} help="Scheduled reports with one or more prior failures." />
        </div>
        <p className="text-xs font-semibold text-ocean-900/60">
          <Clock3 aria-hidden="true" className="mr-1 inline size-3" />
          Last recorded automatic generation (WIB): {when(metrics.reports.lastScheduledGenerationAt)}
        </p>
      </section>

      <section aria-labelledby="operations-email" className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail aria-hidden="true" className="size-5 text-ocean-700" />
          <h2 id="operations-email" className="text-lg font-bold text-ocean-900">Corporate failure-alert email outbox</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Queued" value={metrics.emails.queued} help="Not yet claimed by the email worker." />
          <Metric label="Sending" value={metrics.emails.sending} help="Currently claimed for delivery." />
          <Metric label="Retry" value={metrics.emails.retry} help="Waiting for a scheduled retry." />
          <Metric label="Failed" value={metrics.emails.failed} help="No further automatic attempts." />
          <Metric label="Stale pending 2h+" value={metrics.emails.staleQueued} help="Overdue queued alerts or retries." />
          <Metric label="Expired claims" value={metrics.emails.expiredClaims} help="Sending leases that are already expired." />
          <Metric label="Provider accepted" value={metrics.emails.accepted} help="Accepted by Resend; not evidence of delivery." />
          <Metric label="Delivered" value={metrics.emails.delivered} help="Receiving mail server accepted the message." />
          <Metric label="Delivery problems" value={metrics.emails.deliveryIssues} help="Bounced, complained, failed, or suppressed." />
        </div>
        <p className="text-xs font-semibold text-ocean-900/60">
          Last recorded provider event (WIB): {when(metrics.emails.lastProviderEventAt)}
        </p>
      </section>

      <section aria-labelledby="operations-webhook" className="space-y-3">
        <div className="flex items-center gap-2">
          <RadioTower aria-hidden="true" className="size-5 text-ocean-700" />
          <h2 id="operations-webhook" className="text-lg font-bold text-ocean-900">Verified webhook journal</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Unreconciled" value={metrics.webhook.pending} help="Unapplied signed events matching known corporate alert messages." />
          <Metric label="Unreconciled 2h+" value={metrics.webhook.stalePending} help="Older matches needing worker reconciliation." />
        </div>
        <p className="text-xs font-semibold text-ocean-900/60">
          Last recorded matching webhook (WIB): {when(metrics.webhook.lastReceivedAt)}
        </p>
      </section>

      <footer className="rounded-lg border border-ocean-900/10 bg-white p-4 text-sm font-semibold leading-6 text-ocean-900/60">
        Snapshot at {when(metrics.checkedAt)} WIB. Only aggregate counts are shown; recipient addresses,
        raw webhook bodies and provider IDs are excluded. Webhook counts exclude unrelated Resend traffic.
        Worker heartbeat records indicate authenticated endpoint execution, but do not independently verify
        external cron scheduling or Resend configuration. Alerts are evaluated when an admin opens this page,
        not pushed to email or a separate monitoring provider. <span className="font-bold">No automated resend or report publication is triggered here.</span>
      </footer>
    </div>
  );
}
