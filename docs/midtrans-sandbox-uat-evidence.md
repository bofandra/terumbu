# Midtrans Sandbox UAT: Evidence Collection and Review

**Release decision: NO-GO.** This tooling does not charge/refund customers, approve releases, mutate booking state, or certify merchant sandbox testing. No real merchant credentials were used in this development PR.

## 1. Generate a blank private checklist

```bash
node scripts/midtrans-uat-evidence.mjs init /secure/path/terumbu-uat.json
```

Creates **12 scenarios marked `not_run`** and **six approvals marked `pending`**; does not fabricate passing tests. Only safe internal references and SHA-256 evidence digests belong in the file. Keep it outside the repository and public GitHub Issues. Never include merchant API keys, full provider order IDs, emails, names, payment cards, or bank documents.

| Group | Scenarios | Required evidence |
| --- | --- | --- |
| Donations and expeditions | UAT-01, UAT-02 | Signed webhook, independent provider GET, verified settlement and seat allocation |
| Last-seat concurrency/missed webhooks | UAT-03, UAT-04 | Capacity conflict, compensation and idempotent recovery |
| Failure and upstream outage | UAT-05, UAT-06 | No false payment success and no blind duplicate refund |
| Refund correctness | UAT-07, UAT-08, UAT-09 | Full/partial/unsupported channel and late bank acknowledgment |
| Privacy and operator action | UAT-10, UAT-11 | Cross-device access and immutable customer-contact history |
| Deployment rehearsals | UAT-12 | Worker interruption, migrations and rollback in staging |

Cases UAT-01–09 require actual merchant sandbox evidence (`source: merchant_sandbox`). UAT-10–12 require a browser/operations staging rehearsal (`source: staging_rehearsal`). Mocked CI unit tests do not replace merchant sandbox scenarios.

For every attempted scenario, record `status` (pass/fail/blocked), `evidenceRef` (internal restricted ticket/artifact reference), `evidenceSha256` (64 lowercase hexadecimal digits of the sanitized evidence artifact), `testerId` (safe non-PII reference) and `observedAt` (UTC ISO timestamp). Failed and blocked cases must still have evidence; not-run cases remain empty.

Six independently reviewed roles: product owner, payment engineer, operations/support, finance, security/privacy, and release engineer. Each approved or rejected signoff needs an internal reference, safe approver ID, and timestamp. **Documenting a signoff is not cryptographic proof it was performed.** Reviewers must inspect the referenced private artifacts.

## 2. Read-only existing Midtrans sandbox status

Only after a human tester creates a sandbox order through the approved sandbox merchant account:

```bash
MIDTRANS_ENV=sandbox \
MIDTRANS_SERVER_KEY="<sandbox-server-key>" \
MIDTRANS_SANDBOX_ORDER_ID="<existing-sandbox-order-id>" \
node scripts/midtrans-uat-evidence.mjs probe
```

The script sends only an authenticated GET to `https://api.sandbox.midtrans.com/v2/{order-id}/status`, refuses production settings, matches the order, and emits a minimal redacted observation. The output includes `scenarioVerdict: "not_assessed"`. GET Status alone does **not** prove an entire UAT scenario passed, that a refund hit the customer's bank, or that a seat race was prevented.

Retain original provider/database proofs in a separately approved restricted audit store, not in source code, screenshots shared publicly, or the CLI output.

## 3. Assess checklist completeness, not merchant authenticity

```bash
node scripts/midtrans-uat-evidence.mjs assess /secure/path/terumbu-uat.json
```

The report shows pass/fail/blocked/not-run totals, documented approval counts, and the evidence file fingerprint. Incomplete or invalid packages fail and remain `NO_GO`.

Even if all twelve scenario rows and six approval rows are filled correctly, the result is **`reviewReady: true` with `decision: "NO_GO"`**. This only means the package is *eligible for independent human review*, not that the deployment or financial activation is approved. A human release board must inspect actual evidence, validate its SHA-256, and issue a decision outside the script.

## 4. Review dependencies before integrating

```bash
node scripts/midtrans-pr-stack.mjs
```

The GitHub inspector fetches PR metadata and compares commit ancestry without any writes. See `docs/midtrans-pr-merge-order.md`. Keep the PRs as drafts until actually reviewed; do not rebase or merge all branches solely because CI is green.

## 5. Remaining mandatory go-live gates

Issue #114 must remain open until real merchant sandbox test evidence, finance and security signoff, support escalation, bank/customer refund dispute handling, migration/rollback rehearsal, and production on-call coverage have passed. `MIDTRANS_PAYMENT_ENABLED` and automatic refund production flags remain disabled. The tool does not set any flags.

**The current code is not a completed Midtrans merchant certification.**
