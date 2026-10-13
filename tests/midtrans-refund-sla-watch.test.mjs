import assert from "node:assert/strict";
import test from "node:test";

import {
  MIDTRANS_REFUND_SLA_ISSUE_MARKER,
  MIDTRANS_REFUND_SLA_ISSUE_TITLE,
  monitorMidtransRefundSla,
  probeMidtransRefundSla,
  confirmedMidtransRefundSla
} from "../scripts/monitor-midtrans-refund-sla.mjs";
import {
  INCIDENT_MARKER,
  INCIDENT_TITLE,
  matchesIncident,
  healthEndpoint
} from "../scripts/monitor-worker-heartbeats.mjs";

test("financial endpoint uses canonical HTTPS URL and does not reuse untrusted paths", () => {
  assert.equal(healthEndpoint("https://terumbu.example.test/foo?secret=never",
    "/api/health/midtrans-refunds"), "https://terumbu.example.test/api/health/midtrans-refunds");
  assert.throws(() => healthEndpoint("https://terumbu.example.test", "//evil.invalid"), /Unsupported/);
});

test("refund monitor distinguishes actual SLA breach from unavailable API, missing route or gateway", async () => {
  const scenarios = [
    { code: 200, json: { status: "ok" }, healthy: true, reason: "healthy" },
    { code: 503, json: { status: "unhealthy", order_id: "PRIVATE" }, healthy: false, reason: "refund_sla_breached" },
    { code: 503, json: { status: "unavailable" }, healthy: false, reason: "refund_sla_database_unavailable" },
    { code: 404, json: { status: "missing" }, healthy: false, reason: "refund_sla_endpoint_404" },
    { code: 401, json: { status: "restricted" }, healthy: false, reason: "refund_sla_endpoint_blocked" },
    { code: 403, json: { status: "restricted" }, healthy: false, reason: "refund_sla_endpoint_blocked" },
    { code: 502, json: { status: "gateway" }, healthy: false, reason: "refund_sla_upstream_unavailable" },
    { code: 504, json: { status: "gateway" }, healthy: false, reason: "refund_sla_upstream_unavailable" },
    { code: 500, json: { status: "server" }, healthy: false, reason: "refund_sla_unexpected_http_status" },
    { code: 200, json: { status: "unhealthy" }, healthy: false, reason: "refund_sla_invalid_health_response" },
    { code: 503, json: { status: "ok" }, healthy: false, reason: "refund_sla_invalid_health_response" }
  ];
  for (const scenario of scenarios) {
    const result = await probeMidtransRefundSla("https://terumbu.example.test/path?private=1", async (url, options) => {
      assert.equal(url, "https://terumbu.example.test/api/health/midtrans-refunds");
      assert.equal(options.redirect, "error");
      return new Response(JSON.stringify(scenario.json), { status: scenario.code });
    });
    assert.deepEqual(result, { healthy: scenario.healthy, reason: scenario.reason });
    assert.equal(JSON.stringify(result).includes("PRIVATE"), false);
  }
  assert.deepEqual(await probeMidtransRefundSla("https://terumbu.example.test",
    async () => { throw new Error("PRIVATE secret"); }), {
    healthy: false, reason: "refund_sla_unreachable"
  });
  assert.deepEqual(await probeMidtransRefundSla("https://terumbu.example.test",
    async () => new Response("<html>PRIVATE</html>", { status: 200 })), {
    healthy: false, reason: "refund_sla_invalid_health_response"
  });
});

test("refund monitor retries an outage and suppresses an alert after recovery", async () => {
  let calls = 0;
  const result = await confirmedMidtransRefundSla("https://terumbu.example.test", {
    delay: async () => {},
    fetchImpl: async () => {
      calls++;
      return new Response(JSON.stringify({ status: calls === 1 ? "unhealthy" : "ok" }), {
        status: calls === 1 ? 503 : 200
      });
    }
  });
  assert.equal(calls, 2);
  assert.deepEqual(result, { healthy: true, reason: "healthy" });
});

test("refund incident is distinct, deduplicated, and updates only when diagnosis changes", async () => {
  const issues = [];
  let code = 404;
  let reported = "missing";
  const actions = [];
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.hostname === "terumbu.example.test") {
      assert.equal(parsed.pathname, "/api/health/midtrans-refunds");
      return new Response(JSON.stringify({ status: reported }), { status: code });
    }
    assert.equal(parsed.hostname, "api.github.com");
    assert.equal(options.headers.Authorization, "Bearer secret-unit-test");
    if (parsed.pathname.endsWith("/issues") && options.method === "POST") {
      const body = JSON.parse(options.body);
      assert.equal(body.title, MIDTRANS_REFUND_SLA_ISSUE_TITLE);
      assert.match(body.body, /overdue customer contact/i);
      assert.match(body.body, /refund_sla_endpoint_404/);
      assert.ok(body.body.includes(MIDTRANS_REFUND_SLA_ISSUE_MARKER));
      assert.ok(!body.body.includes(INCIDENT_MARKER));
      assert.doesNotMatch(body.body, /TRB-EXP-|customer@example.org|secret-unit-test/);
      issues.push({ number: 14, title: body.title, body: body.body });
      actions.push("opened");
      return new Response(JSON.stringify(issues[0]), { status: 201 });
    }
    if (parsed.pathname.endsWith("/issues/14") && options.method === "PATCH") {
      const body = JSON.parse(options.body);
      if (body.state === "closed") {
        issues.splice(0, 1);
        actions.push("closed");
      } else {
        assert.equal(typeof body.body, "string");
        assert.ok(body.body.includes(MIDTRANS_REFUND_SLA_ISSUE_MARKER));
        issues[0].body = body.body;
        actions.push("updated");
      }
      return new Response(JSON.stringify({ number: 14 }), { status: 200 });
    }
    if (parsed.pathname.endsWith("/issues") && (!options.method || options.method === "GET")) {
      return new Response(JSON.stringify(issues), { status: 200 });
    }
    throw new Error("Unexpected API call: " + parsed.pathname);
  };
  const params = {
    baseUrl: "https://terumbu.example.test",
    githubToken: "secret-unit-test",
    repo: "bofandra/terumbu",
    assignee: "bofandra",
    fetchImpl,
    delay: async () => {}
  };

  assert.deepEqual(await monitorMidtransRefundSla(params), { healthy: false, incident: "opened" });
  assert.equal(matchesIncident(issues[0]), false);
  assert.equal(matchesIncident(issues[0], MIDTRANS_REFUND_SLA_ISSUE_TITLE, MIDTRANS_REFUND_SLA_ISSUE_MARKER), true);
  assert.deepEqual(await monitorMidtransRefundSla(params), { healthy: false, incident: "already_open" });

  code = 503;
  reported = "unhealthy";
  assert.deepEqual(await monitorMidtransRefundSla(params), { healthy: false, incident: "updated" });
  assert.match(issues[0].body, /\*\*Signal:\*\* refund_sla_breached/);
  assert.match(issues[0].body, /\*\*Signal changed \(UTC\):\*\*/);
  assert.match(issues[0].body, /Check Admin → Operations/);
  assert.deepEqual(await monitorMidtransRefundSla(params), { healthy: false, incident: "already_open" });
  reported = "unavailable";
  assert.deepEqual(await monitorMidtransRefundSla(params), { healthy: false, incident: "updated" });
  assert.match(issues[0].body, /refund_sla_database_unavailable/);
  assert.doesNotMatch(issues[0].body, /customer@example.org/);

  code = 200;
  reported = "ok";
  assert.deepEqual(await monitorMidtransRefundSla(params), { healthy: true, incident: "recovered" });
  assert.deepEqual(actions, ["opened", "updated", "updated", "closed"]);
  assert.equal(issues.length, 0);
  assert.notEqual(MIDTRANS_REFUND_SLA_ISSUE_TITLE, INCIDENT_TITLE);
});

test("monitor workflow always checks refund SLA even after a worker heartbeat alert", async () => {
  const { readFileSync } = await import("node:fs");
  const flow = readFileSync(".github/workflows/worker-health-watch.yml", "utf8");
  const checkStep = flow.split("      - name: Probe Midtrans refund review SLA and synchronize independent incident")[1];
  assert.ok(checkStep, "independent refund step exists");
  assert.match(checkStep, /if:.*success\(\).*failure\(\)/);
  assert.match(checkStep, /run: node scripts\/monitor-midtrans-refund-sla\.mjs/);
});
