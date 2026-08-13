# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./

# Install Sharp and all of its platform packages inside Linux. Never copy host
# node_modules into this image.
RUN npm ci --include=dev --include=optional --no-audit --no-fund

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run build \
    && npm prune --omit=dev --include=optional --no-audit --no-fund \
    && node -e "require('sharp').versions"

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001 \
    LOG_LEVEL=info

WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates dumb-init \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node:node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/readyz',{signal:AbortSignal.timeout(3000)}).then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]

STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main.js"]
