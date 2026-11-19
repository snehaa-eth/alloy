# Alloy worker: Ponder indexer + keeper + price-sync in one container.
# Build context = REPO ROOT (it needs packages/sdk and packages/testnet-env/bot):
#   docker build -f apps/worker/Dockerfile -t alloy-worker .
FROM node:22.12-bookworm-slim
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# deps first (layer cache)
COPY apps/worker/package.json apps/worker/pnpm-lock.yaml apps/worker/
COPY packages/testnet-env/bot/package.json packages/testnet-env/bot/pnpm-lock.yaml packages/testnet-env/bot/
RUN pnpm -C apps/worker install --frozen-lockfile --ignore-workspace --prod=false \
 && pnpm -C packages/testnet-env/bot install --frozen-lockfile --ignore-workspace --prod=false

# sources
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/sdk/src packages/sdk/src
COPY packages/testnet-env/bot/src packages/testnet-env/bot/src
COPY packages/testnet-env/bot/tsconfig.json packages/testnet-env/bot/tsconfig.json
COPY packages/testnet-env/deployments packages/testnet-env/deployments
COPY packages/testnet-env/config packages/testnet-env/config
COPY apps/worker apps/worker

WORKDIR /app/apps/worker
ENV PORT=42069 STATUS_DIR=/tmp/alloy-worker
EXPOSE 42069
CMD ["node", "--import", "tsx", "services/main.ts"]
