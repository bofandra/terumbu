#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-terumbu}"
DEPLOY_BASE="${DEPLOY_BASE:-/home/ubuntu/terumbu}"
DEPLOY_REPO="${DEPLOY_REPO:?DEPLOY_REPO is required}"
DEPLOY_REF="${DEPLOY_REF:-main}"
DEPLOY_VERSION="${DEPLOY_VERSION:-}"

APP_DIR="${DEPLOY_BASE}/repo"
ENV_FILE="${DEPLOY_BASE}/.env"
BACKUP_DIR="${DEPLOY_BASE}/backups"
BACKUP_RETENTION=7
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

APP_PORT="$(awk -F= '/^TERUMBU_APP_PORT=/ { print $2 }' "${ENV_FILE}" | tail -1 | tr -d '\r\n')"
APP_PORT="${APP_PORT#\'}"
APP_PORT="${APP_PORT%\'}"
APP_PORT="${APP_PORT#\"}"
APP_PORT="${APP_PORT%\"}"
APP_PORT="${APP_PORT:-3100}"

PREVIOUS_REVISION="$(docker inspect terumbu-web --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' 2>/dev/null || true)"

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

if [ -z "${DEPLOY_VERSION}" ]; then
  DEPLOY_VERSION="$(git -C "${APP_DIR}" rev-parse HEAD)"
fi

echo "Deploying Terumbu ${DEPLOY_VERSION} from ${DEPLOY_REF}..."

CURRENT_HEAD="$(git -C "${APP_DIR}" rev-parse HEAD)"
case "${CURRENT_HEAD}" in
  "${DEPLOY_VERSION}"*) ;;
  *)
    echo "Checked out ${CURRENT_HEAD}, but deploy version is ${DEPLOY_VERSION}." >&2
    exit 1
    ;;
esac

echo "Checked out ${CURRENT_HEAD}."
if [ -n "${PREVIOUS_REVISION}" ]; then
  echo "Previous running revision: ${PREVIOUS_REVISION}."
fi

restore_repo_to_target() {
  git -C "${APP_DIR}" checkout "${DEPLOY_REF}" >/dev/null 2>&1 || true
  git -C "${APP_DIR}" reset --hard "origin/${DEPLOY_REF}" >/dev/null 2>&1 || true
}

rollback_application() {
  local reason="${1:-deployment verification failure}"
  local rollback_revision="${PREVIOUS_REVISION}"

  if [ -z "${rollback_revision}" ] || [ "${rollback_revision}" = "${DEPLOY_VERSION}" ]; then
    echo "No distinct previous application revision is available for rollback after ${reason}." >&2
    return 1
  fi

  echo "Attempting application rollback to ${rollback_revision} after ${reason}..." >&2

  if ! git -C "${APP_DIR}" cat-file -e "${rollback_revision}^{commit}" 2>/dev/null; then
    if ! git -C "${APP_DIR}" fetch origin "${rollback_revision}"; then
      echo "Unable to fetch rollback revision ${rollback_revision}." >&2
      restore_repo_to_target
      return 1
    fi
  fi

  if ! git -C "${APP_DIR}" checkout --detach "${rollback_revision}"; then
    echo "Unable to check out rollback revision ${rollback_revision}." >&2
    restore_repo_to_target
    return 1
  fi

  local rollback_compose_file="${APP_DIR}/deploy/docker-compose.yml"
  if [ ! -f "${rollback_compose_file}" ]; then
    echo "Rollback revision does not contain deploy/docker-compose.yml." >&2
    restore_repo_to_target
    return 1
  fi

  if ! docker compose \
    --env-file "${ENV_FILE}" \
    --project-name "${PROJECT_NAME}" \
    -f "${rollback_compose_file}" \
    build \
    --build-arg DEPLOY_VERSION="${rollback_revision}" \
    web; then
    echo "Rollback image build failed." >&2
    restore_repo_to_target
    return 1
  fi

  if ! docker compose \
    --env-file "${ENV_FILE}" \
    --project-name "${PROJECT_NAME}" \
    -f "${rollback_compose_file}" \
    up -d --no-build --force-recreate web; then
    echo "Rollback container recreation failed." >&2
    restore_repo_to_target
    return 1
  fi

  if docker compose --env-file "${ENV_FILE}" --project-name "${PROJECT_NAME}" -f "${rollback_compose_file}" config --services | grep -qx "reminder-worker"; then
    docker compose \
      --env-file "${ENV_FILE}" \
      --project-name "${PROJECT_NAME}" \
      -f "${rollback_compose_file}" \
      up -d --no-build --force-recreate reminder-worker || true
  fi

  local rollback_running_revision
  rollback_running_revision="$(docker inspect terumbu-web --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' 2>/dev/null || true)"
  if [ "${rollback_running_revision}" != "${rollback_revision}" ]; then
    echo "Rollback container revision '${rollback_running_revision}' does not match '${rollback_revision}'." >&2
    restore_repo_to_target
    return 1
  fi

  local rollback_healthy=0
  for attempt in $(seq 1 30); do
    local health_response
    health_response="$(curl --max-time 5 -fsS "http://127.0.0.1:${APP_PORT}/api/health" 2>/dev/null || true)"
    if printf '%s' "${health_response}" | grep -q '"status":"ok"' &&
      printf '%s' "${health_response}" | grep -q "\"version\":\"${rollback_revision}\""; then
      rollback_healthy=1
      break
    fi
    echo "Rollback revision is not ready yet (${attempt}/30)." >&2
    sleep 5
  done

  if [ "${rollback_healthy}" != "1" ]; then
    echo "Rollback revision ${rollback_revision} did not become healthy." >&2
    docker compose --env-file "${ENV_FILE}" --project-name "${PROJECT_NAME}" -f "${rollback_compose_file}" logs --tail=120 web >&2 || true
    restore_repo_to_target
    return 1
  fi

  if [ -f "${APP_DIR}/scripts/smoke-production.sh" ]; then
    if ! BASE_URL="http://127.0.0.1:${APP_PORT}" EXPECTED_VERSION="${rollback_revision}" bash "${APP_DIR}/scripts/smoke-production.sh"; then
      echo "Rollback revision failed the production smoke suite." >&2
      restore_repo_to_target
      return 1
    fi
  fi

  echo "Application rollback to ${rollback_revision} succeeded. Database migrations were not rolled back." >&2
  restore_repo_to_target
  return 0
}

docker compose \
  --env-file "${ENV_FILE}" \
  --project-name "${PROJECT_NAME}" \
  -f "${COMPOSE_FILE}" \
  up -d postgres

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"
BACKUP_TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${BACKUP_DIR}/terumbu-postgres-${BACKUP_TIMESTAMP}-${CURRENT_HEAD:0:12}.dump"
BACKUP_TEMP="${BACKUP_FILE}.tmp"

echo "Creating pre-migration PostgreSQL backup at ${BACKUP_FILE}..."
if ! docker compose \
  --env-file "${ENV_FILE}" \
  --project-name "${PROJECT_NAME}" \
  -f "${COMPOSE_FILE}" \
  exec -T postgres sh -ec 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' > "${BACKUP_TEMP}"; then
  rm -f "${BACKUP_TEMP}"
  echo "PostgreSQL backup failed; aborting before migrations." >&2
  exit 1
fi

if [ ! -s "${BACKUP_TEMP}" ]; then
  rm -f "${BACKUP_TEMP}"
  echo "PostgreSQL backup is empty; aborting before migrations." >&2
  exit 1
fi

mv "${BACKUP_TEMP}" "${BACKUP_FILE}"
chmod 600 "${BACKUP_FILE}"
echo "Pre-migration backup created."

backup_index=0
while IFS= read -r backup_path; do
  backup_index=$((backup_index + 1))
  if [ "${backup_index}" -gt "${BACKUP_RETENTION}" ]; then
    rm -f -- "${backup_path}"
  fi
done < <(
  find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'terumbu-postgres-*.dump' -printf '%T@ %p\n' \
    | sort -nr \
    | cut -d' ' -f2-
)

docker compose \
  --env-file "${ENV_FILE}" \
  --project-name "${PROJECT_NAME}" \
  -f "${COMPOSE_FILE}" \
  build \
  --pull \
  --build-arg DEPLOY_VERSION="${DEPLOY_VERSION}" \
  migrate

docker compose \
  --env-file "${ENV_FILE}" \
  --project-name "${PROJECT_NAME}" \
  -f "${COMPOSE_FILE}" \
  run --rm -T migrate </dev/null

docker compose \
  --env-file "${ENV_FILE}" \
  --project-name "${PROJECT_NAME}" \
  -f "${COMPOSE_FILE}" \
  build \
  --pull \
  --build-arg DEPLOY_VERSION="${DEPLOY_VERSION}" \
  web

if ! docker compose \
  --env-file "${ENV_FILE}" \
  --project-name "${PROJECT_NAME}" \
  -f "${COMPOSE_FILE}" \
  up -d --no-build --force-recreate web reminder-worker; then
  echo "New application containers failed to start." >&2
  rollback_application "container recreation failure" || true
  exit 1
fi

RUNNING_REVISION="$(docker inspect terumbu-web --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' 2>/dev/null || true)"
if [ "${RUNNING_REVISION}" != "${DEPLOY_VERSION}" ]; then
  echo "terumbu-web is running revision '${RUNNING_REVISION}', expected '${DEPLOY_VERSION}'." >&2
  docker compose --env-file "${ENV_FILE}" --project-name "${PROJECT_NAME}" -f "${COMPOSE_FILE}" ps >&2
  rollback_application "revision mismatch" || true
  exit 1
fi

echo "terumbu-web is running revision ${RUNNING_REVISION}."

echo "Waiting for Terumbu on 127.0.0.1:${APP_PORT}..."
HEALTHY=0
for attempt in $(seq 1 60); do
  HEALTH_RESPONSE="$(curl --max-time 5 -fsS "http://127.0.0.1:${APP_PORT}/api/health" 2>/dev/null || true)"
  if printf '%s' "${HEALTH_RESPONSE}" | grep -q '"status":"ok"'; then
    if printf '%s' "${HEALTH_RESPONSE}" | grep -q "\"version\":\"${DEPLOY_VERSION}\""; then
      echo "Terumbu is healthy on port ${APP_PORT} with version ${DEPLOY_VERSION}."
      HEALTHY=1
      break
    fi
    echo "Terumbu responded with a different version: ${HEALTH_RESPONSE}"
  fi
  echo "Terumbu is not ready yet (${attempt}/60)."
  sleep 5
done

if [ "${HEALTHY}" != "1" ]; then
  echo "Terumbu did not become healthy in time. Recent logs:" >&2
  docker compose --env-file "${ENV_FILE}" --project-name "${PROJECT_NAME}" -f "${COMPOSE_FILE}" logs --tail=120 web >&2
  rollback_application "health check failure" || true
  exit 1
fi

echo "Running production smoke suite..."
if ! BASE_URL="http://127.0.0.1:${APP_PORT}" EXPECTED_VERSION="${DEPLOY_VERSION}" bash "${APP_DIR}/scripts/smoke-production.sh"; then
  echo "Production smoke suite failed. Recent web logs:" >&2
  docker compose --env-file "${ENV_FILE}" --project-name "${PROJECT_NAME}" -f "${COMPOSE_FILE}" logs --tail=180 web >&2 || true
  rollback_application "production smoke failure" || true
  exit 1
fi

docker compose --env-file "${ENV_FILE}" --project-name "${PROJECT_NAME}" -f "${COMPOSE_FILE}" ps
echo "Terumbu deployment and production smoke checks passed."
echo "Latest pre-migration database backup: ${BACKUP_FILE}"
