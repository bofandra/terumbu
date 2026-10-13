import assert from "node:assert/strict";
import test from "node:test";

import {
  MIDTRANS_REFUND_SLA_ISSUE_MARKER,
  MIDTRANS_REFUND_SLA_ISSUE_TITLE,
  monitorMidtransRefundSla
} from "../scripts/monitor-midtrans-refund-sla.mjs";
import {
  INCIDENT_MARKER,
  INCIDENT_TITLE,
  matchesIncident,
  healthEndpoint
} from "../scripts/monitor-worker-heartbeats.mjs";

test("dedicated financial health endpoint is canonical and restricted", () => {
  assert.equal(healthEndpoint("https://terumbu.example.test/foo?secret=never",
    "/api/health/midtrans-refunds"), "https://terumbu.example.test/api/health/midtrans-refunds");
  assert.throws(() => healthEndpoint("https://terumbu.example.test", "//evil.invalid"), /Unsupported/);
});

test("refund SLA outage opens a distinct redacted issue, dedupes and closes after recovery", async () => {
  const issues = [];
  let healthy = false;
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.hostname === "terumbu.example.test") {
      assert.equal(parsed.pathname, "/api/health/midtrans-refunds");
      return new Response(JSON.stringify({ status: healthy ? "ok" : "unhealthy" }), {
        status: healthy ? 200 : 503
      });
    }
    assert.equal(parsed.hostname, "api.github.com");
    assert.equal(options.headers.Authorization, "Bearer secret-unit-test");
    if (parsed.pathname.endsWith("/issues") && options.method === "POST") {
      const body = JSON.parse(options.body);
      assert.equal(body.title, MIDTRANS_REFUND_SLA_ISSUE_TITLE);
      assert.match(body.body, /overdue customer contact/i);
      assert.ok(body.body.includes(MIDTRANS_REFUND_SLA_ISSUE_MARKER));
      assert.ok(!body.body.includes(INCIDENT_MARKER));
      assert.doesNotMatch(body.body, /TRB-EXP-|customer@example.org|secret-unit-test/);
      const issue = { number: 14, title: body.title, body: body.body };
      issues.push(issue);
      calls.push("opened");
      return new Response(JSON.stringify(issue), { status: 201 });
    }
    if (parsed.pathname.endsWith("/issues/14") && options.method === "PATCH") {
      assert.equal(JSON.parse(options.body).state, "closed");
      issues.splice(issues.findIndex(x => x.number === 14), 1);
      calls.push("closed");
      return new Response(JSON.stringify({ number: 14 }), { status: 200 });
    }
    if (parsed.pathname.endsWith("/issues") && (!options.method || options.method === "GET")) {
      return new Response(JSON.stringify(issues), { status: 200 });
    }
    throw new Error("Unexpected request: " + parsed.pathname);
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
  healthy = true;
  assert.deepEqual(await monitorMidtransRefundSla(params), { healthy: true, incident: "recovered" });
  assert.deepEqual(calls, ["opened", "closed"]);
  assert.equal(issues.length, 0);
  assert.notEqual(MIDTRANS_REFUND_SLA_ISSUE_TITLE, INCIDENT_TITLE);
});
