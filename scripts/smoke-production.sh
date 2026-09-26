#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:${TERUMBU_APP_PORT:-3100}}"
BASE_URL="${BASE_URL%/}"
EXPECTED_VERSION="${EXPECTED_VERSION:-}"

fail() {
  echo "Smoke check failed: $*" >&2
  exit 1
}

fetch_page() {
  local path="$1"
  curl --max-time 15 -fsSL "${BASE_URL}${path}"
}

assert_public_page() {
  local path="$1"
  local body
  body="$(fetch_page "${path}")" || fail "${path} did not return a successful response"
  printf '%s' "${body}" | grep -qi '<html' || fail "${path} did not return HTML"
  if printf '%s' "${body}" | grep -qi 'Internal Server Error'; then
    fail "${path} contains an internal server error"
  fi
  echo "Smoke OK: ${path}" >&2
  printf '%s' "${body}"
}

health="$(curl --max-time 10 -fsS "${BASE_URL}/api/health")" || fail "/api/health is unavailable"
printf '%s' "${health}" | grep -q '"status":"ok"' || fail "/api/health did not report ok"
if [ -n "${EXPECTED_VERSION}" ]; then
  printf '%s' "${health}" | grep -q "\"version\":\"${EXPECTED_VERSION}\"" || fail "running version does not match ${EXPECTED_VERSION}"
fi

assert_public_page "/" >/dev/null
campaigns="$(assert_public_page "/campaigns")"
expeditions="$(assert_public_page "/expeditions")"
assert_public_page "/destinations" >/dev/null
assert_public_page "/academy" >/dev/null
assert_public_page "/about" >/dev/null
assert_public_page "/login" >/dev/null

first_campaign="$(printf '%s' "${campaigns}" | grep -oE 'href="/campaigns/[^"#?]+' | head -n 1 | cut -d'"' -f2 || true)"
if [ -n "${first_campaign}" ]; then
  assert_public_page "${first_campaign}" >/dev/null
fi

first_expedition="$(printf '%s' "${expeditions}" | grep -oE 'href="/expeditions/[^"#?]+' | head -n 1 | cut -d'"' -f2 || true)"
if [ -n "${first_expedition}" ]; then
  detail="$(assert_public_page "${first_expedition}")"
  for obsolete in "Sustainable project" "Higher approval" "Higher chance of approval" "Some content is adapted for international travelers"; do
    if printf '%s' "${detail}" | grep -Fqi "${obsolete}"; then
      fail "expedition detail still exposes obsolete copy: ${obsolete}"
    fi
  done
fi

protected_status="$(curl --max-time 10 -sS -o /dev/null -w '%{http_code}' "${BASE_URL}/dashboard" || true)"
case "${protected_status}" in
  200|302|303|307|308) ;;
  *) fail "/dashboard returned unexpected anonymous status ${protected_status}" ;;
esac

echo "Production smoke suite passed."
