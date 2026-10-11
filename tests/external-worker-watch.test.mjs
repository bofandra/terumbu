import assert from "node:assert/strict";
import test from "node:test";

import {
  INCIDENT_MARKER,
  INCIDENT_TITLE,
  confirmedWorkerHealth,
  healthEndpoint,
  matchesIncident,
  probeWorkerHealth,
  syncWorkerIncident
} from "../scripts/monitor-worker-heartbeats.mjs";

test("monitor accepts only safe origin URLs and canonical health endpoint", () => {
  assert.equal(healthEndpoint("https://terumbu.world/other?ignored=1"), "https://terumbu.world/api/health/workers");
  assert.throws(() => healthEndpoint("http://example.com"), /HTTPS/);
  assert.throws(() => healthEndpoint("https://user:password@example.com"), /credentials/);
});

test("remote probe requires HTTP 200 and exact healthy response and hides response bodies", async () => {
  assert.deepEqual(
    await probeWorkerHealth("https://terumbu.world", async () => new Response('{"status":"ok"}', { status: 200 })),
    { healthy: true, reason: "healthy" }
  );
  assert.deepEqual(
    await probeWorkerHealth("https://terumbu.world", async () => new Response('{"status":"failed","secret":"never leak"}', { status: 503 })),
    { healthy: false, reason: "http_503" }
  );
  assert.deepEqual(
    await probeWorkerHealth("https://terumbu.world", async () => new Response("<html>gateway</html>", { status: 200 })),
    { healthy: false, reason: "unreachable_or_invalid_response" }
  );
  assert.deepEqual(
    await probeWorkerHealth("https://terumbu.world", async () => { throw new Error("Provider private credentials"); }),
    { healthy: false, reason: "unreachable_or_invalid_response" }
  );
});

test("single transient network failure is retried before opening an incident", async () => {
  let attempts = 0;
  const result = await confirmedWorkerHealth("https://terumbu.world", {
    delay: async () => {},
    fetchImpl: async () => {
      attempts += 1;
      return new Response(attempts === 1 ? '{"status":"unhealthy"}' : '{"status":"ok"}', {
        status: attempts === 1 ? 503 : 200
      });
    }
  });
  assert.equal(attempts, 2);
  assert.equal(result.healthy, true);
});

test("incident matching excludes pull requests, similar titles and unmarked issues", () => {
  const good = { number: 4, title: INCIDENT_TITLE, body: INCIDENT_MARKER };
  assert.equal(matchesIncident(good), true);
  assert.equal(matchesIncident({ ...good, pull_request: { url: "pr" } }), false);
  assert.equal(matchesIncident({ ...good, title: "Other issue" }), false);
  assert.equal(matchesIncident({ ...good, body: "" }), false);
});

test("outage opens one safe issue, repeat checks dedupe, and recovery closes it", async () => {
  const issues = [];
  const actions = [];
  const token = "unit-test-token-do-not-log";
  const fetchImpl = async (url, options = {}) => {
    assert.equal(options.headers.Authorization, "Bearer " + token);
    const endpoint = new URL(url);
    assert.equal(endpoint.hostname, "api.github.com");
    if (endpoint.pathname.endsWith("/issues") && options.method === "POST") {
      const body = JSON.parse(options.body);
      assert.equal(body.title, INCIDENT_TITLE);
      assert.match(body.body, /http_503/);
      assert.match(body.body, /Check the authenticated Admin/);
      assert.doesNotMatch(body.body, /secret|credentials|private database payload/i);
      issues.push({ number: 11, title: body.title, body: body.body });
      actions.push("opened");
      return new Response(JSON.stringify({ number: 11 }), { status: 201 });
    }
    if (endpoint.pathname.endsWith("/issues/11") && options.method === "PATCH") {
      const body = JSON.parse(options.body);
      assert.equal(body.state, "closed");
      issues.splice(0, 1);
      actions.push("closed");
      return new Response(JSON.stringify({ number: 11 }), { status: 200 });
    }
    if (endpoint.pathname.endsWith("/issues") && (!options.method || options.method === "GET")) {
      return new Response(JSON.stringify(issues), { status: 200 });
    }
    throw new Error("Unexpected test API call " + endpoint.pathname);
  };
  const options = { fetchImpl, githubToken: token, repo: "bofandra/terumbu" };
  assert.deepEqual(await syncWorkerIncident({
    ...options,
    health: { healthy: false, reason: "http_503" }
  }), { action: "opened", count: 1 });
  assert.deepEqual(await syncWorkerIncident({
    ...options,
    health: { healthy: false, reason: "unreachable_or_invalid_response" }
  }), { action: "already_open", count: 1 });
  assert.deepEqual(await syncWorkerIncident({
    ...options,
    health: { healthy: true, reason: "healthy" }
  }), { action: "recovered", count: 1 });
  assert.deepEqual(actions, ["opened", "closed"]);
});

test("GitHub issues sync fails safely when API fails or no token is configured", async () => {
  await assert.rejects(syncWorkerIncident({ repo: "bofandra/terumbu", health: { healthy: false } }), /GITHUB_TOKEN/);
  await assert.rejects(syncWorkerIncident({
    repo: "bofandra/terumbu",
    githubToken: "fake",
    health: { healthy: false },
    fetchImpl: async () => new Response("unauthorized credentials in body", { status: 403 })
  }), /operation failed with HTTP 403/);
});
