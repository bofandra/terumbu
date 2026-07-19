import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDonationReceiptDownloadHtml,
  donationReceiptFilename,
  donationReceiptHolderName,
  donationReceiptProviderReference,
  type DonationReceiptDownloadRecord
} from "../src/lib/donation-receipt";

const receipt: DonationReceiptDownloadRecord = {
  donationId: "donation-1",
  receiptNumber: "TRB-RCP-2026-0001",
  issuedAt: new Date("2026-07-12T00:00:00.000Z"),
  emailedAt: new Date("2026-07-12T00:00:00.000Z"),
  payload: {
    providerReference: "demo-ref-1"
  },
  donorName: "Raka Pramana",
  donorEmail: "raka@example.test",
  amount: "250000.00",
  currency: "IDR",
  status: "paid",
  createdAt: new Date("2026-07-12T00:00:00.000Z"),
  campaignTitle: "Reef Recovery",
  campaignSlug: "reef-recovery",
  organizationName: "Terumbu Field Team"
};

test("donation receipt helpers produce stable public labels", () => {
  assert.equal(donationReceiptFilename(receipt), "terumbu-receipt-trb-rcp-2026-0001.html");
  assert.equal(donationReceiptHolderName(receipt), "Raka Pramana");
  assert.equal(donationReceiptHolderName({ donorName: null, donorEmail: "supporter@example.test" }), "supporter@example.test");
  assert.equal(donationReceiptHolderName({ donorName: null, donorEmail: null }), "Terumbu.eco supporter");
  assert.equal(donationReceiptProviderReference(receipt), "demo-ref-1");
  assert.equal(donationReceiptProviderReference({ payload: {} }), "Recorded");
});

test("donation receipt download html escapes unsafe fields", () => {
  const html = buildDonationReceiptDownloadHtml(
    {
      ...receipt,
      receiptNumber: "TRB<script>",
      donorName: "Raka & Team",
      campaignTitle: "Campaign <One>",
      organizationName: "Org <Two>"
    },
    "https://example.test"
  );

  assert.match(html, /Raka &amp; Team/);
  assert.match(html, /Campaign &lt;One&gt;/);
  assert.match(html, /Org &lt;Two&gt;/);
  assert.match(html, /TRB&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /https:\/\/example.test\/campaigns\/reef-recovery/);
});
