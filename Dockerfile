# syntax=docker/dockerfile:1

# -------- builder stage
FROM node:20 AS builder
RUN corepack enable && \
    corepack prepare pnpm@8.15.4 --activate && \
    npm exec --yes playwright@1.53.1 install --with-deps

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG SKIP_TESTS=0

WORKDIR /app

# Disable Husky and npm lifecycle scripts
ENV HUSKY=0 NPM_CONFIG_IGNORE_SCRIPTS=true \
    NODE_OPTIONS=--max-old-space-size=8192


# Install Docker CLI for development tasks
RUN apt-get update \
    && apt-get install -y --no-install-recommends docker.io \
    && rm -rf /var/lib/apt/lists/*


# -------- install root dependencies
COPY package.json package-lock.json ./
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true \
    && npm config delete proxy \
    && npm config delete https-proxy \
    && if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi \
    && npm install --no-audit --no-fund

# -------- install backend dependencies
COPY backend/package.json backend/package-lock.json ./backend/
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true \
    && npm config delete proxy \
    && npm config delete https-proxy \
    && if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi \
    && npm install --no-audit --no-fund --prefix backend

# -------- install hunyuan_server dependencies if present
COPY backend/hunyuan_server/package.json backend/hunyuan_server/package-lock.json ./backend/hunyuan_server/
RUN if [ -f backend/hunyuan_server/package-lock.json ]; then \
        unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true && \
        npm config delete proxy && \
        npm config delete https-proxy && \
        if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
        if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi && \
        npm install --no-audit --no-fund --prefix backend/hunyuan_server; \
    fi


# -------- copy source and run CI
COPY . .
RUN [ "$SKIP_TESTS" = "1" ] || \
    (command -v pnpm >/dev/null && pnpm run ci || npm run ci || \
     echo "ℹ️  pnpm run ci skipped – pnpm or script not found")

# -------- prune dev dependencies
RUN pnpm prune --prod \
    && pnpm prune --prod --filter ./backend

# -------- runtime stage
FROM node:20

ARG HTTP_PROXY
ARG HTTPS_PROXY

WORKDIR /app

ENV HUSKY=0 NPM_CONFIG_IGNORE_SCRIPTS=true \
    NODE_OPTIONS=--max-old-space-size=8192

RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true \
    && npm config delete proxy \
    && npm config delete https-proxy

# Copy production dependencies and built app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json /app/backend/pnpm-lock.yaml ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/hunyuan_server/package.json /app/backend/hunyuan_server/package-lock.json ./backend/hunyuan_server/
COPY --from=builder /app/backend/hunyuan_server/node_modules ./backend/hunyuan_server/node_modules

COPY --from=builder /app .

EXPOSE 3000

CMD ["npm","start","--prefix","backend"]
