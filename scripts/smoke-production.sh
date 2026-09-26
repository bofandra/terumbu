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
  grep -qi '<html' <<<"${body}" || fail "${path} did not return HTML"
  if grep -qi 'Internal Server Error' <<<"${body}"; then
    fail "${path} contains an internal server error"
  fi
  echo "Smoke OK: ${path}" >&2
  printf '%s' "${body}"
}

health="$(curl --max-time 10 -fsS "${BASE_URL}/api/health")" || fail "/api/health is unavailable"
grep -q '"status":"ok"' <<<"${health}" || fail "/api/health did not report ok"
if [ -n "${EXPECTED_VERSION}" ]; then
  grep -q "\"version\":\"${EXPECTED_VERSION}\"" <<<"${health}" || fail "running version does not match ${EXPECTED_VERSION}"
fi

assert_public_page "/" >/dev/null
campaigns="$(assert_public_page "/campaigns")"
expeditions="$(assert_public_page "/expeditions")"
destinations="$(assert_public_page "/destinations")"
first_destination=""
destination_href_re='href="(/destinations/[^"#?]+)'
if [[ ${destinations} =~ ${destination_href_re} ]]; then
  first_destination="${BASH_REMATCH[1]}"
fi
if [ -n "${first_destination}" ]; then
  assert_public_page "${first_destination}" >/dev/null
fi
assert_public_page "/academy" >/dev/null
assert_public_page "/about" >/dev/null
assert_public_page "/login" >/dev/null

first_campaign=""
campaign_href_re='href="(/campaigns/[^"#?]+)'
if [[ ${campaigns} =~ ${campaign_href_re} ]]; then
  first_campaign="${BASH_REMATCH[1]}"
fi
if [ -n "${first_campaign}" ]; then
  assert_public_page "${first_campaign}" >/dev/null
fi

first_expedition=""
expedition_href_re='href="(/expeditions/[^"#?]+)'
if [[ ${expeditions} =~ ${expedition_href_re} ]]; then
  first_expedition="${BASH_REMATCH[1]}"
fi
if [ -n "${first_expedition}" ]; then
  detail="$(assert_public_page "${first_expedition}")"
  for obsolete in "Sustainable project" "Higher approval" "Higher chance of approval" "Some content is adapted for international travelers"; do
    if grep -Fqi "${obsolete}" <<<"${detail}"; then
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
