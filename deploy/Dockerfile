FROM node:24-alpine AS deps
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS migrator
WORKDIR /app

ARG DEPLOY_VERSION=local

ENV NEXT_TELEMETRY_DISABLED=1

COPY drizzle.config.ts tsconfig.json ./
COPY drizzle ./drizzle
COPY src/db ./src/db

LABEL org.opencontainers.image.revision="${DEPLOY_VERSION}"

CMD ["npm", "run", "db:migrate"]

FROM node:24-alpine AS builder
WORKDIR /app

ARG DEPLOY_VERSION=local

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN printf '%s\n' "${DEPLOY_VERSION}" > .deploy-version && npm run build

FROM node:24-alpine AS runner
WORKDIR /app

ARG DEPLOY_VERSION=local

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV TERUMBU_DEPLOY_VERSION="${DEPLOY_VERSION}"

LABEL org.opencontainers.image.revision="${DEPLOY_VERSION}"

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
