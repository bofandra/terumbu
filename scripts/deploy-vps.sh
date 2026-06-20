#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-terumbu}"
DEPLOY_BASE="${DEPLOY_BASE:-/home/ubuntu/terumbu}"
DEPLOY_REPO="${DEPLOY_REPO:?DEPLOY_REPO is required}"
DEPLOY_REF="${DEPLOY_REF:-main}"

APP_DIR="${DEPLOY_BASE}/repo"
ENV_FILE="${DEPLOY_BASE}/.env"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.yml"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required on the VPS" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required on the VPS" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is required on the VPS" >&2
  exit 1
fi

mkdir -p "${DEPLOY_BASE}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing ${ENV_FILE}. Create it from deploy/.env.example or let GitHub Actions upload it." >&2
  exit 1
fi

if [ ! -d "${APP_DIR}/.git" ]; then
  git clone --branch "${DEPLOY_REF}" "${DEPLOY_REPO}" "${APP_DIR}"
else
  git -C "${APP_DIR}" fetch origin "${DEPLOY_REF}"
  git -C "${APP_DIR}" checkout "${DEPLOY_REF}"
  git -C "${APP_DIR}" reset --hard "origin/${DEPLOY_REF}"
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "Missing compose file at ${COMPOSE_FILE}" >&2
  exit 1
fi

docker compose \
  --env-file "${ENV_FILE}" \
  --project-name "${PROJECT_NAME}" \
  -f "${COMPOSE_FILE}" \
  up -d postgres

docker compose \
  --env-file "${ENV_FILE}" \
  --project-name "${PROJECT_NAME}" \
  -f "${COMPOSE_FILE}" \
  build migrate

docker compose \
  --env-file "${ENV_FILE}" \
  --project-name "${PROJECT_NAME}" \
  -f "${COMPOSE_FILE}" \
  run --rm migrate

docker compose \
  --env-file "${ENV_FILE}" \
  --project-name "${PROJECT_NAME}" \
  -f "${COMPOSE_FILE}" \
  up -d --build web

APP_PORT="$(awk -F= '/^TERUMBU_APP_PORT=/ { print $2 }' "${ENV_FILE}" | tail -1 | tr -d '\r\n')"
APP_PORT="${APP_PORT#\'}"
APP_PORT="${APP_PORT%\'}"
APP_PORT="${APP_PORT#\"}"
APP_PORT="${APP_PORT%\"}"
APP_PORT="${APP_PORT:-3100}"

echo "Waiting for Terumbu on 127.0.0.1:${APP_PORT}..."
for attempt in $(seq 1 60); do
  if curl --max-time 5 -fsS "http://127.0.0.1:${APP_PORT}/" >/dev/null; then
    echo "Terumbu is healthy on port ${APP_PORT}."
    docker compose --env-file "${ENV_FILE}" --project-name "${PROJECT_NAME}" -f "${COMPOSE_FILE}" ps
    exit 0
  fi

  echo "Terumbu is not ready yet (${attempt}/60)."
  sleep 5
done

echo "Terumbu did not become healthy in time. Recent logs:" >&2
docker compose --env-file "${ENV_FILE}" --project-name "${PROJECT_NAME}" -f "${COMPOSE_FILE}" logs --tail=120 web >&2
exit 1
