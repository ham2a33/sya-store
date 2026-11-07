# Pin the Node major and Debian release used for both build and runtime.
FROM node:22.23.4-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22.23.4-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=${NEXT_PUBLIC_WHATSAPP_NUMBER}
RUN npm run build

FROM node:22.23.4-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nextjs \
    && useradd --system --uid 1001 --gid nextjs --home-dir /app nextjs
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
# Keep safe, non-customer JSON and bundled uploads outside the mount targets.
# The startup initializer copies only missing files into persistent volumes.
COPY --from=builder --chown=nextjs:nextjs /app/data/products.json /app/data/categories.json /app/data/banners.json /app/data/homepage.json /app/data/media.json ./seed-data/
COPY --from=builder --chown=nextjs:nextjs /app/public/uploads/products/ ./seed-uploads/products/
COPY --from=builder --chown=nextjs:nextjs /app/scripts/seed-admin.mjs ./scripts/seed-admin.mjs
COPY --chown=nextjs:nextjs docker/init-data.mjs ./docker/init-data.mjs
COPY --chown=nextjs:nextjs docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod 0555 ./docker/entrypoint.sh \
    && mkdir -p /app/data /app/public/uploads/products \
    && chown -R nextjs:nextjs /app/data /app/public/uploads
USER nextjs
EXPOSE 3000
ENTRYPOINT ["/app/docker/entrypoint.sh"]
