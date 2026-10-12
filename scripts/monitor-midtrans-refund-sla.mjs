import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import {
  confirmedWorkerHealth,
  syncWorkerIncident
} from "./monitor-worker-heartbeats.mjs";

export const MIDTRANS_REFUND_SLA_ISSUE_TITLE =
  "[Terumbu Payments] Midtrans refund review SLA incident";
export const MIDTRANS_REFUND_SLA_ISSUE_MARKER =
  "<!-- terumbu-midtrans-refund-sla:v1 -->";

/**
 * GitHub-hosted monitor is independent from the VPS. The health endpoint
 * returns only a coarse status; financial amounts and customer details never
 * pass through public GitHub issue bodies or job logs.
 */
export async function monitorMidtransRefundSla({
  baseUrl,
  githubToken,
  repo,
  assignee = "",
  fetchImpl = fetch,
  delay
}) {
  const health = await confirmedWorkerHealth(baseUrl, {
    fetchImpl,
    ...(delay ? { delay } : {}),
    resource: "/api/health/midtrans-refunds"
  });
  const incident = await syncWorkerIncident({
    fetchImpl,
    githubToken,
    repo,
    health,
    assignee,
    incidentTitle: MIDTRANS_REFUND_SLA_ISSUE_TITLE,
    incidentMarker: MIDTRANS_REFUND_SLA_ISSUE_MARKER,
    remediation: "Check Admin → Operations → Midtrans compensation cases. Prioritize overdue customer contact, refunds unresolved over 24 hours, and provider refunds missing acquiring-bank acknowledgement after 72 hours. Do not retry a refund blindly."
  });
  return { healthy: health.healthy, incident: incident.action };
}

export async function main(env = process.env) {
  if (!env.MONITOR_BASE_URL) throw new Error("MONITOR_BASE_URL is required");
  const result = await monitorMidtransRefundSla({
    baseUrl: env.MONITOR_BASE_URL,
    githubToken: env.GITHUB_TOKEN,
    repo: env.GITHUB_REPOSITORY,
    assignee: env.MONITOR_ASSIGNEE ?? ""
  });
  console.log("Terumbu refund SLA health:", result.healthy ? "healthy" : "unhealthy",
    "incident:", result.incident);
  if (!result.healthy) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(() => {
    console.error("Refund SLA external monitor could not synchronize its incident.");
    process.exitCode = 1;
  });
}
