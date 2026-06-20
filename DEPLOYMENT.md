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
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_CLIENT_KEY`
- `XENDIT_SECRET_KEY`
- `RESEND_API_KEY`
- `POSTHOG_KEY`

Optional repository variables:

- `TERUMBU_APP_PORT`: default `3100`
- `NEXT_PUBLIC_APP_URL`: default `http://<VPS_HOST>:<TERUMBU_APP_PORT>`
- `TERUMBU_POSTGRES_DB`: default `terumbu`
- `TERUMBU_POSTGRES_USER`: default `terumbu`
- `POSTHOG_HOST`: default `https://app.posthog.com`

## CI/CD Flow

Workflow file:

- `.github/workflows/deploy.yml`

On push to `main`, GitHub Actions:

1. Checks out the repository.
2. Installs dependencies with `npm ci`.
3. Runs `npm run typecheck`.
4. Runs `npm run lint`.
5. Runs `npm run build`.
6. Uploads the production `.env` to `/home/ubuntu/terumbu/.env`.
7. SSHes into the VPS.
8. Clones or updates `/home/ubuntu/terumbu/repo`.
9. Starts the internal PostgreSQL container.
10. Runs `npm run db:migrate` in a one-shot Docker Compose migration container on the VPS.
11. Rebuilds/restarts the web container.
12. Health-checks `http://127.0.0.1:3100/` on the VPS.

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
