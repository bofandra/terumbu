import assert from "node:assert/strict";
import test from "node:test";

import { formatCurrency, formatCurrencyText } from "../src/lib/utils";

test("currency formatter defaults to USD and supports explicit IDR", () => {
  const formatted = formatCurrency(3200000);
  const rupiah = formatCurrency(3200000, "IDR");

  assert.match(formatted, /^USD\s*3\.200\.000,00$/);
  assert.match(rupiah, /^IDR\s*3\.200\.000$/);
  assert.doesNotMatch(formatted, /Rp/);
  assert.doesNotMatch(rupiah, /Rp/);
});

test("currency text formatter normalizes legacy rupiah labels", () => {
  const formatted = formatCurrencyText("Rp1.5M donation and Rp 250.000 pledge");

  assert.equal(formatted, "IDR 1.5M donation and IDR 250.000 pledge");
  assert.doesNotMatch(formatted, /Rp/);
});
