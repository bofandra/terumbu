# Terumbu.eco Deployment Notes

## Current VPS Snapshot

Checked on 2026-06-20 against the VPS at the SumoPod address shown by the owner.

Host:

- OS: Ubuntu 24.04.4 LTS
- User: `ubuntu`
- Docker: installed and running
- Docker Compose: installed
- Firewall: `ufw` inactive
- Disk: about 30 GB free on `/`
- Memory: about 1.9 GiB RAM with swap enabled

Existing running containers:

| Container | Compose project | Port usage | Notes |
| --- | --- | --- | --- |
| `kliniksatu-web` | `kliniksatu` | `443` | Existing service, do not touch |
| `ai-avatar-web-1` | `ai-avatar` | `80` | Existing service, do not touch |
| `ai-avatar-api-1` | `ai-avatar` | `8000` | Existing service, do not touch |

Important port decision:

- `80`, `443`, and `8000` are already occupied.
- Terumbu uses `3100` by default to avoid replacing or interrupting existing services.
- PostgreSQL is not currently visible as an installed package or Docker container on this VPS, so this deployment includes a dedicated internal PostgreSQL container for Terumbu.

## Deployment Shape

Terumbu deploys as an isolated Docker Compose project:

- Project name: `terumbu`
- VPS base directory: `/home/ubuntu/terumbu`
- Git checkout: `/home/ubuntu/terumbu/repo`
- Production env file: `/home/ubuntu/terumbu/.env`
- App container: `terumbu-web`
- Database container: `terumbu-postgres`
- Public app port: `3100` by default
- Internal app port: `3000`
- Internal database only, not exposed publicly

The deploy script intentionally does not run:

- `docker stop`
- `docker rm`
- `docker compose down`
- `docker system prune`
- commands against existing `kliniksatu` or `ai-avatar` projects

## GitHub Actions Secrets

Add these in GitHub:

```text
Settings -> Secrets and variables -> Actions -> Repository secrets
```

Required secrets:

- `VPS_HOST`: VPS public IP or domain
- `VPS_USER`: `ubuntu`
- `VPS_SSH_KEY`: private SSH key allowed to log in as `ubuntu`
- `TERUMBU_POSTGRES_PASSWORD`: strong password for the Terumbu PostgreSQL container

Optional secrets:

- `TERUMBU_DATABASE_URL`: full database URL. If omitted, Actions builds one for the internal Compose PostgreSQL service.
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_CLIENT_KEY`
- `XENDIT_SECRET_KEY`
- `DEMO_GATEWAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `POSTHOG_KEY`
- `CRON_SECRET`: optional; deployment generates a random value when omitted.

Optional repository variables:

- `TERUMBU_APP_PORT`: default `3100`
- `NEXT_PUBLIC_APP_URL`: default `http://<VPS_HOST>:<TERUMBU_APP_PORT>`
- `SESSION_COOKIE_SECURE`: optional override, set `true` for HTTPS-only cookies or `false` for plain HTTP. If omitted, Terumbu infers this from `NEXT_PUBLIC_APP_URL`.
- `TERUMBU_POSTGRES_DB`: default `terumbu`
- `TERUMBU_POSTGRES_USER`: default `terumbu`
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_BUCKET`
- `CLOUDFLARE_R2_PUBLIC_BASE_URL`
- `SUPPORT_EMAIL`: defaults in the app to `support@terumbu.eco`
- `NEXT_PUBLIC_SUPPORT_WHATSAPP_URL`
- `POSTHOG_HOST`: default `https://app.posthog.com`
- `ADMIN_QUERY_WARN_MS`: default `750`
- `NEXT_PUBLIC_FX_USD_EUR`, `NEXT_PUBLIC_FX_USD_IDR`, and `NEXT_PUBLIC_FX_USD_JPY`: optional display-rate overrides.

To enable Cloudflare R2, configure all five R2 values together: account ID, bucket, access key ID, secret access key, and public base URL. The workflow rejects a partial R2 configuration so production cannot silently enter a half-configured storage state. Account ID, bucket, and public base URL may be stored as either repository variables or secrets; access credentials must be repository secrets.

## CI/CD Flow

Workflow file:

- `.github/workflows/deploy.yml`

On push to `main`, GitHub Actions:

1. Checks out the repository.
2. Installs dependencies with `npm ci`.
3. Runs `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
4. In parallel, builds a fresh PostgreSQL database from `npm run db:migrate`, seeds deterministic fixtures, and runs the Playwright critical-path E2E suite.
5. Uploads the production `.env` to `/home/ubuntu/terumbu/.env`.
6. SSHes into the VPS.
7. Clones or updates `/home/ubuntu/terumbu/repo`.
8. Starts the internal PostgreSQL container.
9. Creates a compressed PostgreSQL `pg_dump` under `/home/ubuntu/terumbu/backups` before any migration runs, keeps the latest 7 backups, and aborts if the backup is missing or empty.
10. Runs `npm run db:migrate` in a one-shot Docker Compose migration container on the VPS.
11. Rebuilds the web image with the Git commit SHA as `DEPLOY_VERSION`.
12. Force-recreates the `terumbu-web` container from that freshly built image.
13. Health-checks the deployed version and runs the production smoke suite before declaring deployment successful.
14. If the new container fails to start, reports the wrong revision, fails health checks, or fails smoke tests, the deploy script attempts to rebuild and restore the previously running application revision.

Application rollback intentionally does **not** restore the database automatically. The pre-migration dump is retained for controlled database recovery because automatic database restoration could discard writes made after the backup.

The deploy script intentionally force-recreates only the Terumbu web container so the compiled Next.js bundle cannot remain stale after a successful deploy.

Commit generated Drizzle files under `drizzle/` with the schema change. GitHub Actions deploys from the pushed commit, so uncommitted migration files cannot run on the VPS.

## Manual VPS Deploy

After creating `/home/ubuntu/terumbu/.env`, a manual deploy can be run with:

```bash
DEPLOY_BASE=/home/ubuntu/terumbu \
DEPLOY_REPO=https://github.com/bofandra/terumbu.git \
DEPLOY_REF=main \
bash scripts/deploy-vps.sh
```

## Local Checks

Before pushing:

```bash
npm run typecheck
npm run lint
npm run build
```

Optional Docker check:

```bash
docker compose --env-file deploy/.env.example -f deploy/docker-compose.yml build
```


## Database Recovery

Automatic deploy backups are stored on the VPS at:

```text
/home/ubuntu/terumbu/backups/terumbu-postgres-<UTC timestamp>-<commit>.dump
```

The directory is mode `700`, backup files are mode `600`, and the deploy script retains the 7 newest dumps.

To inspect available backups:

```bash
ls -lh /home/ubuntu/terumbu/backups
```

Database restore is intentionally a manual incident-recovery operation. Stop or isolate writes first, verify the intended backup, and use PostgreSQL `pg_restore` against the correct database rather than letting deployment automation overwrite live data.
