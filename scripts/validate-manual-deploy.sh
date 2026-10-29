#!/usr/bin/env bash
# Fail closed: only a main push or explicitly confirmed manual main dispatch
# may deploy the exact checked-out commit, before SSH or database migration.
set -euo pipefail

fail() {
  echo "Production deployment authorization rejected: $1" >&2
  exit 1
}

[ "${GITHUB_REF:-}" = "refs/heads/main" ] ||
  fail "only the main branch may deploy"
case "${GITHUB_EVENT_NAME:-}" in
  push)
    # Main branch changes are approved to release after passing CI and E2E.
    ;;
  workflow_dispatch)
    [ "${REQUESTED_CONFIRM:-}" = "true" ] ||
      fail "manual production confirmation not granted"
    ;;
  *) fail "only main push and explicitly confirmed manual dispatch may deploy" ;;
esac

[[ "${REQUESTED_SHA:-}" =~ ^[a-f0-9]{40}$ ]] ||
  fail "a full lowercase 40-character release commit SHA is required"
[[ "${GITHUB_SHA:-}" =~ ^[a-f0-9]{40}$ ]] ||
  fail "GitHub commit identity is missing or malformed"
[ "${REQUESTED_SHA}" = "${GITHUB_SHA}" ] ||
  fail "release SHA is not the selected workflow commit"
[ "${REQUESTED_SHA}" = "$(git rev-parse HEAD)" ] ||
  fail "release SHA does not match checked-out code"

release_reference="${CHANGE_TICKET:-release-${REQUESTED_SHA:0:12}}"
[[ "${release_reference}" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{5,79}$ ]] ||
  fail "release references must use 6-80 ASCII letters, digits, hyphens or underscores"

echo "Production deployment authorization passed."
echo "Release commit: ${REQUESTED_SHA}"
echo "Release reference: ${release_reference}"
echo "Trigger: ${GITHUB_EVENT_NAME}"
echo "Production is main-only; GitHub environment protection still applies."
