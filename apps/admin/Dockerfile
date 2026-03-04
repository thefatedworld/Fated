FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile --filter @fated/admin...

COPY apps/admin/ ./apps/admin/
COPY tsconfig.base.json ./

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build Next.js (standalone output)
RUN pnpm --filter @fated/admin build

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup -S fated && adduser -S fated -G fated

COPY --from=builder --chown=fated:fated /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=fated:fated /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder --chown=fated:fated /app/apps/admin/public ./apps/admin/public

USER fated

EXPOSE 3001

CMD ["node", "apps/admin/server.js"]
