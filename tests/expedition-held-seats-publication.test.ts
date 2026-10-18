import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("pending-payment holds are shared by marketplace and both publication gates", () => {
  const query = readFileSync("src/lib/queries.ts", "utf8");
  const actions = readFileSync("src/lib/portal-actions.ts", "utf8");
  const source = readFileSync("src/lib/expedition-held-seats.ts", "utf8");
  assert.match(source, /pending_payment/);
  assert.match(source, /hold_expires_at > now\(\)/);
  assert.match(source, /payment_status in \('created', 'pending'\)/);
  assert.match(query, /heldSeats: pendingPaymentHeldSeats/);
  assert.match(actions, /heldSeats: pendingPaymentHeldSeats/);
  assert.match(query, /availableSeats: Math\.max\(0, row\.capacity - row\.seatsBooked - row\.heldSeats\)/);
  assert.match(query, /seatsBooked: row\.seatsBooked \+ row\.heldSeats/);
});
