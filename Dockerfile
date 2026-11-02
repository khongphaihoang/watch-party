# syntax=docker/dockerfile:1

# Ảnh chạy web Rạp Nhà (Next.js 15, output standalone).
# Build context là GỐC repo để dùng package-lock.json của npm workspaces.

FROM node:22-alpine AS base
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1

# --- Dependencies -------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY watch-party/package.json ./watch-party/
RUN npm ci --workspace watch-party --include-workspace-root

# --- Build --------------------------------------------------------------------
FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
# NEXT_PUBLIC_* được nhúng vào bundle lúc build; đặt biến ở runtime KHÔNG có tác dụng.
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Bật output standalone cho image; build local không đặt biến này để `next start` vẫn dùng được.
ENV NEXT_STANDALONE=1
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY watch-party ./watch-party
RUN npm run build --workspace watch-party

# --- Runtime ------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /repo/watch-party/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/watch-party/.next/static ./watch-party/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/watch-party/public ./watch-party/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "watch-party/server.js"]
