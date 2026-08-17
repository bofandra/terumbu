import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDonationReceiptDownloadPdf,
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
  assert.equal(donationReceiptFilename(receipt), "terumbu-receipt-trb-rcp-2026-0001.pdf");
  assert.equal(donationReceiptHolderName(receipt), "Raka Pramana");
  assert.equal(donationReceiptHolderName({ donorName: null, donorEmail: "supporter@example.test" }), "supporter@example.test");
  assert.equal(donationReceiptHolderName({ donorName: null, donorEmail: null }), "Terumbu.eco supporter");
  assert.equal(donationReceiptProviderReference(receipt), "demo-ref-1");
  assert.equal(donationReceiptProviderReference({ payload: {} }), "Recorded");
});

test("donation receipt download pdf includes receipt details", () => {
  const pdf = buildDonationReceiptDownloadPdf(
    {
      ...receipt,
      receiptNumber: "TRB(script)",
      donorName: "Raka \\ Team",
      campaignTitle: "Campaign (One)",
      organizationName: "Org\nTwo"
    },
    "https://example.test"
  );
  const pdfText = Buffer.from(pdf).toString("latin1");

  assert.match(pdfText, /^%PDF-1\.4/);
  assert.match(pdfText, /Terumbu\.eco Donation Receipt/);
  assert.match(pdfText, /TRB\\\(script\\\)/);
  assert.match(pdfText, /Raka \\\\ Team/);
  assert.match(pdfText, /Campaign \\\(One\\\)/);
  assert.match(pdfText, /Org Two/);
  assert.match(pdfText, /IDR\s*250\.000/);
  assert.match(pdfText, /https:\/\/example.test\/campaigns\/reef-recovery/);
});
