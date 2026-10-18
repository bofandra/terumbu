import assert from "node:assert/strict";
import test from "node:test";
import { parseFrankfurterRates, refreshFxReference } from "../scripts/refresh-fx-rates.mjs";

const date = "2026-10-16";
const now = new Date("2026-10-18T08:00:00Z");
const rows = [
  { date, base: "USD", quote: "EUR", rate: 0.85 },
  { date, base: "USD", quote: "IDR", rate: 16750 },
  { date, base: "USD", quote: "JPY", rate: 149 }
];

test("validated FX snapshot uses a single published date and explicit USD quotes", () => {
  const result = parseFrankfurterRates(rows, now);
  assert.deepEqual(result.usdRates, { USD: 1, EUR: 0.85, IDR: 16750, JPY: 149 });
  assert.equal(result.asOf, date);
  assert.match(result.source, /Frankfurter/);
});

test("unverified FX sources cannot change the committed reference", () => {
  const invalid = [
    rows.slice(0, 2),
    [...rows, rows[0]],
    rows.map((r, i) => i === 0 ? { ...r, base: "EUR" } : r),
    rows.map((r, i) => i === 0 ? { ...r, quote: "GBP" } : r),
    rows.map((r, i) => i === 0 ? { ...r, rate: 0 } : r),
    rows.map((r, i) => i === 0 ? { ...r, rate: 1_000_000 } : r),
    rows.map((r, i) => i === 0 ? { ...r, date: "2026-10-15" } : r),
    rows.map((r, i) => i === 0 ? { ...r, date: "2026-02-30" } : r),
    rows.map((r) => ({ ...r, date: "2018-01-01" })),
    rows.map((r) => ({ ...r, date: "2026-10-19" }))
  ];
  for (const candidate of invalid) assert.throws(() => parseFrankfurterRates(candidate, now));
});

test("HTTP and JSON retrieval failures are propagated, not written as invented rates", async () => {
  await assert.rejects(refreshFxReference(async () => ({ ok: false, status: 503 }), now), /503/);
  await assert.rejects(refreshFxReference(async () => ({ ok: true, json: async () => [] }), now), /exactly three/);
  assert.equal((await refreshFxReference(async () => ({ ok: true, json: async () => rows }), now)).asOf, date);
});
