import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import {
  healthEndpoint,
  syncWorkerIncident
} from "./monitor-worker-heartbeats.mjs";

export const MIDTRANS_REFUND_SLA_ISSUE_TITLE =
  "[Terumbu Payments] Midtrans refund review SLA incident";
export const MIDTRANS_REFUND_SLA_ISSUE_MARKER =
  "<!-- terumbu-midtrans-refund-sla:v1 -->";

/**
 * Distinguish an SLA breach from an unreachable production origin or a route
 * that was never deployed. Only an allowlisted coarse status leaves the probe:
 * never log or publish a provider payload, financial count or user identifier.
 */
export async function probeMidtransRefundSla(baseUrl, fetchImpl = fetch) {
  const url = healthEndpoint(baseUrl, "/api/health/midtrans-refunds");
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
      redirect: "error"
    });
  } catch {
    return { healthy: false, reason: "refund_sla_unreachable" };
  }

  if (response.status === 404) return { healthy: false, reason: "refund_sla_endpoint_404" };
  if (response.status === 401 || response.status === 403) {
    return { healthy: false, reason: "refund_sla_endpoint_blocked" };
  }
  if (response.status === 502 || response.status === 504) {
    return { healthy: false, reason: "refund_sla_upstream_unavailable" };
  }
  if (response.status !== 200 && response.status !== 503) {
    return { healthy: false, reason: "refund_sla_unexpected_http_status" };
  }
  try {
    const body = await response.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { healthy: false, reason: "refund_sla_invalid_health_response" };
    }
    if (response.status === 200 && body.status === "ok") {
      return { healthy: true, reason: "healthy" };
    }
    if (response.status === 503 && body.status === "unhealthy") {
      return { healthy: false, reason: "refund_sla_breached" };
    }
    if (response.status === 503 && body.status === "unavailable") {
      return { healthy: false, reason: "refund_sla_database_unavailable" };
    }
    return { healthy: false, reason: "refund_sla_invalid_health_response" };
  } catch {
    return { healthy: false, reason: "refund_sla_invalid_health_response" };
  }
}

export async function confirmedMidtransRefundSla(baseUrl, {
  fetchImpl = fetch,
  delay = () => new Promise(done => setTimeout(done, 15000))
} = {}) {
  const initial = await probeMidtransRefundSla(baseUrl, fetchImpl);
  if (initial.healthy) return initial;
  await delay();
  return probeMidtransRefundSla(baseUrl, fetchImpl);
}

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
  const health = await confirmedMidtransRefundSla(baseUrl, {
    fetchImpl,
    ...(delay ? { delay } : {})
  });
  const incident = await syncWorkerIncident({
    fetchImpl,
    githubToken,
    repo,
    health,
    assignee,
    incidentTitle: MIDTRANS_REFUND_SLA_ISSUE_TITLE,
    incidentMarker: MIDTRANS_REFUND_SLA_ISSUE_MARKER,
    refreshIncidentSignal: true,
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
