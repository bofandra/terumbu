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

assert_seo_detail() {
  local path="$1"
  local body="$2"

  grep -Fqi 'application/ld+json' <<<"${body}" || fail "${path} is missing JSON-LD"
  grep -Fqi 'rel="canonical"' <<<"${body}" || fail "${path} is missing a canonical link"
  echo "SEO OK: ${path}" >&2
}

assert_sitemap_path() {
  local path="$1"

  [ -n "${path}" ] || return 0
  grep -Fq "${path}" <<<"${sitemap}" || fail "sitemap.xml is missing ${path}"
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
academy="$(assert_public_page "/academy")"
assert_public_page "/about" >/dev/null
assert_public_page "/login" >/dev/null

first_destination=""
destination_href_re='href="(/destinations/[^"#?]+)'
if [[ ${destinations} =~ ${destination_href_re} ]]; then
  first_destination="${BASH_REMATCH[1]}"
fi
destination_detail=""
if [ -n "${first_destination}" ]; then
  destination_detail="$(assert_public_page "${first_destination}")"
  assert_seo_detail "${first_destination}" "${destination_detail}"
fi

first_campaign=""
campaign_href_re='href="(/campaigns/[^"#?]+)'
if [[ ${campaigns} =~ ${campaign_href_re} ]]; then
  first_campaign="${BASH_REMATCH[1]}"
fi
campaign_detail=""
if [ -n "${first_campaign}" ]; then
  campaign_detail="$(assert_public_page "${first_campaign}")"
  assert_seo_detail "${first_campaign}" "${campaign_detail}"
fi

first_expedition=""
expedition_href_re='href="(/expeditions/[^"#?]+)'
if [[ ${expeditions} =~ ${expedition_href_re} ]]; then
  first_expedition="${BASH_REMATCH[1]}"
fi
if [ -n "${first_expedition}" ]; then
  detail="$(assert_public_page "${first_expedition}")"
  assert_seo_detail "${first_expedition}" "${detail}"
  for obsolete in "Sustainable project" "Higher approval" "Higher chance of approval" "Some content is adapted for international travelers"; do
    if grep -Fqi "${obsolete}" <<<"${detail}"; then
      fail "expedition detail still exposes obsolete copy: ${obsolete}"
    fi
  done
fi

first_course=""
course_href_re='href="(/academy/courses/[^"#?]+)'
if [[ ${academy} =~ ${course_href_re} ]]; then
  first_course="${BASH_REMATCH[1]}"
fi
if [ -n "${first_course}" ]; then
  course_detail="$(assert_public_page "${first_course}")"
  assert_seo_detail "${first_course}" "${course_detail}"
fi

first_partner=""
partner_href_re='href="(/partners/[^"#?]+)'
if [ -n "${campaign_detail}" ] && [[ ${campaign_detail} =~ ${partner_href_re} ]]; then
  first_partner="${BASH_REMATCH[1]}"
fi
if [ -n "${first_partner}" ]; then
  partner_detail="$(assert_public_page "${first_partner}")"
  assert_seo_detail "${first_partner}" "${partner_detail}"
fi

sitemap="$(curl --max-time 15 -fsSL "${BASE_URL}/sitemap.xml")" || fail "/sitemap.xml is unavailable"
grep -Fq '<urlset' <<<"${sitemap}" || fail "/sitemap.xml is not a URL set"
assert_sitemap_path "/campaigns"
assert_sitemap_path "/expeditions"
assert_sitemap_path "/destinations"
assert_sitemap_path "/academy"
assert_sitemap_path "${first_destination}"
assert_sitemap_path "${first_campaign}"
assert_sitemap_path "${first_expedition}"
assert_sitemap_path "${first_course}"
assert_sitemap_path "${first_partner}"
if grep -Fq '/login</loc>' <<<"${sitemap}"; then
  fail "sitemap.xml should not advertise /login"
fi
echo "SEO OK: /sitemap.xml" >&2

robots="$(curl --max-time 15 -fsSL "${BASE_URL}/robots.txt")" || fail "/robots.txt is unavailable"
for rule in "/admin" "/partner" "/dashboard" "/checkout" "/api" "/login" "/corporate/"; do
  grep -Fq "Disallow: ${rule}" <<<"${robots}" || fail "robots.txt is missing Disallow: ${rule}"
done
grep -Fq 'Sitemap:' <<<"${robots}" || fail "robots.txt is missing sitemap declaration"
echo "SEO OK: /robots.txt" >&2

protected_status="$(curl --max-time 10 -sS -o /dev/null -w '%{http_code}' "${BASE_URL}/dashboard" || true)"
case "${protected_status}" in
  200|302|303|307|308) ;;
  *) fail "/dashboard returned unexpected anonymous status ${protected_status}" ;;
esac

echo "Production smoke suite passed."
