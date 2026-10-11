import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const INCIDENT_TITLE = "[Terumbu Operations] External worker heartbeat incident";
export const INCIDENT_MARKER = "<!-- terumbu-external-worker-watch:v1 -->";

export function healthEndpoint(baseUrl) {
  const origin = new URL(baseUrl);
  if (origin.protocol !== "https:" && origin.hostname !== "127.0.0.1" && origin.hostname !== "localhost") {
    throw new Error("Monitor target must be HTTPS.");
  }
  // Strip userinfo and never reuse an arbitrary path/query from the base URL.
  if (origin.username || origin.password) throw new Error("Monitor target cannot contain credentials.");
  return new URL("/api/health/workers", origin).toString();
}

export async function probeWorkerHealth(baseUrl, fetchImpl = fetch) {
  const url = healthEndpoint(baseUrl);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
      cache: "no-store"
    });
    if (response.status !== 200) {
      return { healthy: false, reason: response.status === 503 ? "http_503" : "unexpected_http_status" };
    }
    const data = await response.json();
    return data && data.status === "ok"
      ? { healthy: true, reason: "healthy" }
      : { healthy: false, reason: "invalid_health_response" };
  } catch {
    // Never include raw network/provider exception text in issues or logs.
    return { healthy: false, reason: "unreachable_or_invalid_response" };
  }
}

/** Retry a failing probe once to filter brief network interruptions. */
export async function confirmedWorkerHealth(
  baseUrl,
  { fetchImpl = fetch, delay = () => new Promise((done) => setTimeout(done, 15000)) } = {}
) {
  const initial = await probeWorkerHealth(baseUrl, fetchImpl);
  if (initial.healthy) return initial;
  await delay();
  return probeWorkerHealth(baseUrl, fetchImpl);
}

export function matchesIncident(issue) {
  return issue &&
    !issue.pull_request &&
    issue.title === INCIDENT_TITLE &&
    typeof issue.body === "string" &&
    issue.body.includes(INCIDENT_MARKER);
}

async function githubRequest(fetchImpl, githubToken, path, method = "GET", body = undefined) {
  const response = await fetchImpl("https://api.github.com" + path, {
    method,
    headers: {
      Authorization: "Bearer " + githubToken,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error("GitHub Issues API operation failed with HTTP " + response.status);
  return response.json();
}

export async function syncWorkerIncident({
  fetchImpl = fetch,
  githubToken,
  repo,
  health,
  runUrl = "",
  assignee = ""
}) {
  if (!githubToken) throw new Error("GITHUB_TOKEN is required");
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo || "")) {
    throw new Error("Valid owner/repo is required");
  }

  if (assignee && !/^[a-zA-Z0-9-]{1,39}$/.test(assignee)) {
    throw new Error("Invalid monitoring issue assignee");
  }

  const path = "/repos/" + repo;
  const incidents = [];
  // Paginate. A busy repository can have more than one page of open issues.
  for (let page = 1; page <= 10; page += 1) {
    const open = await githubRequest(fetchImpl, githubToken, path + "/issues?state=open&per_page=100&page=" + page);
    if (!Array.isArray(open)) throw new Error("Unexpected GitHub issues response");
    incidents.push(...open.filter(matchesIncident));
    if (open.length < 100) break;
    if (page === 10) throw new Error("Too many open issues to safely deduplicate an incident");
  }

  if (health.healthy) {
    for (const incident of incidents) {
      await githubRequest(fetchImpl, githubToken, path + "/issues/" + incident.number, "PATCH", {
        state: "closed", state_reason: "completed"
      });
    }
    return { action: incidents.length ? "recovered" : "healthy", count: incidents.length };
  }

  if (incidents.length > 0) {
    return { action: "already_open", count: incidents.length };
  }
  const body = [
    INCIDENT_MARKER,
    "The independent GitHub Actions monitor confirmed that the Terumbu worker health endpoint is unhealthy.",
    "",
    "**Signal:** " + (health.reason ?? "unhealthy"),
    "**Observed (UTC):** " + new Date().toISOString(),
    "",
    "Check the authenticated Admin → Operations dashboard, the terumbu-reminder-worker container, and the production deployment logs.",
    "This issue is automatically closed after the external health probe recovers.",
    "No customer, delivery provider, or private database details are included.",
    ...(runUrl && /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/actions\/runs\/[0-9]+$/.test(runUrl)
      ? ["", "Workflow run: " + runUrl]
      : [])
  ].join("\n");
  await githubRequest(fetchImpl, githubToken, path + "/issues", "POST", {
    title: INCIDENT_TITLE,
    body,
    ...(assignee ? { assignees: [assignee] } : {})
  });
  return { action: "opened", count: 1 };
}

export async function main(env = process.env) {
  if (!env.MONITOR_BASE_URL) throw new Error("MONITOR_BASE_URL must be set");
  const health = await confirmedWorkerHealth(env.MONITOR_BASE_URL);
  const result = await syncWorkerIncident({
    githubToken: env.GITHUB_TOKEN,
    repo: env.GITHUB_REPOSITORY,
    health,
    assignee: env.MONITOR_ASSIGNEE ?? "",
    runUrl: env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
      ? env.GITHUB_SERVER_URL + "/" + env.GITHUB_REPOSITORY + "/actions/runs/" + env.GITHUB_RUN_ID
      : ""
  });
  console.log("Terumbu external worker check:", health.healthy ? "healthy" : "unhealthy", "incident:", result.action);
  if (!health.healthy) process.exitCode = 1; // Failure is independently visible in Actions history.
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(() => {
    // Avoid exposing GitHub/provider body or secret values in public logs.
    console.error("External worker monitor failed before completing its incident synchronization.");
    process.exitCode = 1;
  });
}
