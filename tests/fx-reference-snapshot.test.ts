import assert from "node:assert/strict";
import test from "node:test";
import { validateDisplayFxSnapshot } from "../src/lib/currency-display";

test("FX snapshots require unexpired rates and complete provenance", () => {
  const now = new Date("2026-10-18T08:00:00Z");
  const valid = { asOf: "2026-10-16", source: "Frankfurter blended official source", usdRates: { USD: 1, EUR: 0.85, IDR: 16750, JPY: 149 } };
  assert.deepEqual(validateDisplayFxSnapshot(valid, now), valid);
  assert.equal(validateDisplayFxSnapshot({ ...valid, asOf: "" }, now), null);
  assert.equal(validateDisplayFxSnapshot({ ...valid, asOf: "2026-10-19" }, now), null);
  assert.equal(validateDisplayFxSnapshot({ ...valid, asOf: "2026-02-30" }, now), null);
  assert.equal(validateDisplayFxSnapshot({ ...valid, asOf: "2026-09-01" }, now), null);
  assert.equal(validateDisplayFxSnapshot({ ...valid, usdRates: { ...valid.usdRates, IDR: 0 } }, now), null);
  assert.equal(validateDisplayFxSnapshot({ ...valid, source: "" }, now), null);
});
