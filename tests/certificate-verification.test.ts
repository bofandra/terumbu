import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCertificateDownloadHtml,
  certificateCredentialName,
  certificateDownloadFilename,
  certificateHolderName,
  certificateScore,
  certificateStatusLabel,
  certificateVerificationUrl,
  type CertificateVerificationRecord
} from "../src/lib/certificate-verification";

const certificate: CertificateVerificationRecord = {
  certificateNumber: "TRB-2026-0001",
  publicSlug: "public-certificate",
  issuedAt: new Date("2026-07-10T00:00:00.000Z"),
  metadata: {
    credential: "Reef Stewardship Certificate",
    score: "92%"
  },
  courseTitle: "Coral Restoration Basics",
  courseSlug: "coral-restoration-basics",
  userName: "Raka Demo",
  displayName: "Raka Pramana"
};

test("certificate verification labels prefer public-safe learner and credential names", () => {
  assert.equal(certificateHolderName(certificate), "Raka Pramana");
  assert.equal(certificateCredentialName(certificate), "Reef Stewardship Certificate");
  assert.equal(certificateHolderName({ displayName: "", userName: "Learner Name" }), "Learner Name");
  assert.equal(certificateHolderName({ displayName: null, userName: null }), "Verified learner");
  assert.equal(certificateCredentialName({ metadata: { credential: " " }, courseTitle: "Fallback Course" }), "Fallback Course");
});

test("certificate score parsing is defensive", () => {
  assert.equal(certificateScore(certificate), 92);
  assert.equal(certificateScore({ metadata: { score: 101.7 } }), 100);
  assert.equal(certificateScore({ metadata: { score: "-5" } }), 0);
  assert.equal(certificateScore({ metadata: { score: "not recorded" } }), null);
  assert.equal(certificateScore({ metadata: null }), null);
});

test("certificate share and download helpers are stable", () => {
  assert.equal(certificateVerificationUrl("abc-123"), "https://terumbu.eco/certificates/verify/abc-123");
  assert.equal(certificateVerificationUrl("abc-123", "https://example.test"), "https://example.test/certificates/verify/abc-123");
  assert.equal(certificateDownloadFilename(certificate), "terumbu-certificate-trb-2026-0001.html");
  assert.equal(certificateStatusLabel(certificate), "Verified certificate");
});

test("certificate download html escapes unsafe certificate fields", () => {
  const html = buildCertificateDownloadHtml(
    {
      ...certificate,
      certificateNumber: "TRB<script>",
      courseTitle: "Course <One>",
      displayName: "Raka & Team"
    },
    "https://example.test"
  );

  assert.match(html, /Raka &amp; Team/);
  assert.match(html, /Course &lt;One&gt;/);
  assert.match(html, /TRB&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /https:\/\/example.test\/certificates\/verify\/public-certificate/);
});
