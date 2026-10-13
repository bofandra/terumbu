#!/usr/bin/env bash
# Fail closed: only an explicit manual dispatch of the exact main commit can
# start a production deploy. Called inside the protected production job,
# before loading credentials, network access or VPS database migration.
set -euo pipefail

fail() {
  echo "Production deployment authorization rejected: $1" >&2
  exit 1
}

[ "${GITHUB_EVENT_NAME:-}" = "workflow_dispatch" ] ||
  fail "automatic push and pull-request events must never deploy"
[ "${GITHUB_REF:-}" = "refs/heads/main" ] ||
  fail "only manual main-branch dispatch can deploy"
[ "${REQUESTED_CONFIRM:-}" = "true" ] ||
  fail "manual production confirmation not granted"

[[ "${REQUESTED_SHA:-}" =~ ^[a-f0-9]{40}$ ]] ||
  fail "a full lowercase 40-character approved commit SHA is required"
[[ "${GITHUB_SHA:-}" =~ ^[a-f0-9]{40}$ ]] ||
  fail "GitHub commit identity is missing or malformed"
[ "${REQUESTED_SHA}" = "${GITHUB_SHA}" ] ||
  fail "approved SHA is not the selected workflow commit"
[ "${REQUESTED_SHA}" = "$(git rev-parse HEAD)" ] ||
  fail "approved SHA does not match checked-out code"

[[ "${CHANGE_TICKET:-}" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{5,79}$ ]] ||
  fail "a valid internal approved release ticket is required"

echo "Manual production deployment authorization passed."
echo "Release commit: ${REQUESTED_SHA}"
echo "Internal release ticket: ${CHANGE_TICKET}"
echo "Important: repository administrators must independently configure"
echo "required reviewers and branch restrictions on the production environment."
