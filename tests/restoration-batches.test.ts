import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionRestorationBatch, validRestorationAllocationUnits } from "../src/lib/restoration-batches";

test("restoration batches progress sequentially", () => {
 assert.equal(canTransitionRestorationBatch("planned","planted"), true);
 assert.equal(canTransitionRestorationBatch("planted","monitored"), true);
 assert.equal(canTransitionRestorationBatch("planned","monitored"), false);
 assert.equal(canTransitionRestorationBatch("monitored","planted"), false);
});
test("allocation cannot exceed sponsored units", () => {
 assert.equal(validRestorationAllocationUnits(5,10), true);
 assert.equal(validRestorationAllocationUnits(10,10), true);
 assert.equal(validRestorationAllocationUnits(11,10), false);
 assert.equal(validRestorationAllocationUnits(0,10), false);
});
