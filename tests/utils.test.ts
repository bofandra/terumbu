import assert from "node:assert/strict";
import test from "node:test";

import { formatCurrency, formatCurrencyText } from "../src/lib/utils";

test("currency formatter uses IDR code instead of rupiah symbol", () => {
  const formatted = formatCurrency(3200000);

  assert.match(formatted, /^IDR\s*3\.200\.000$/);
  assert.doesNotMatch(formatted, /Rp/);
});

test("currency text formatter normalizes legacy rupiah labels", () => {
  const formatted = formatCurrencyText("Rp1.5M donation and Rp 250.000 pledge");

  assert.equal(formatted, "IDR 1.5M donation and IDR 250.000 pledge");
  assert.doesNotMatch(formatted, /Rp/);
});
