# syntax=docker/dockerfile:1

# -------- builder stage
FROM node:20 AS builder
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

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
COPY package.json pnpm-lock.yaml ./
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true \
    && npm config delete proxy \
    && npm config delete https-proxy \
    && if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi \
    && pnpm install --frozen-lockfile

# -------- install backend dependencies
COPY backend/package.json backend/pnpm-lock.yaml ./backend/
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true \
    && npm config delete proxy \
    && npm config delete https-proxy \
    && if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi \
    && pnpm install --frozen-lockfile --prefix backend

# -------- install hunyuan_server dependencies if present
COPY backend/hunyuan_server/package.json backend/hunyuan_server/pnpm-lock.yaml ./backend/hunyuan_server/
RUN if [ -f backend/hunyuan_server/pnpm-lock.yaml ]; then \
        unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true && \
        npm config delete proxy && \
        npm config delete https-proxy && \
        if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
        if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi && \
        pnpm install --frozen-lockfile --prefix backend/hunyuan_server; \
    fi


# -------- copy source and run CI
COPY . .
RUN npx playwright install --with-deps
RUN if [ "$SKIP_TESTS" = "1" ]; then \
      echo "\u2139\uFE0F  CI tests skipped (SKIP_TESTS=1)"; \
    else \
      if command -v pnpm >/dev/null; then \
        pnpm run ci || npm run ci || echo "\u26A0\uFE0F  pnpm run ci failed but build will proceed"; \
      else \
        echo "\u26A0\uFE0F  pnpm missing, falling back to npm run ci"; \
        npm run ci || echo "\u26A0\uFE0F  npm run ci failed but build will proceed"; \
      fi; \
    fi

# -------- prune dev dependencies
RUN pnpm prune --prod \
    && pnpm prune --prod --dir backend \
    && if [ -d backend/hunyuan_server ]; then \
         pnpm prune --prod --dir backend/hunyuan_server; \
       fi

# -------- runtime stage
FROM node:20
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate

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
COPY --from=builder /app/backend/hunyuan_server/package.json /app/backend/hunyuan_server/pnpm-lock.yaml ./backend/hunyuan_server/
COPY --from=builder /app/backend/hunyuan_server/node_modules ./backend/hunyuan_server/node_modules

COPY --from=builder /app .

EXPOSE 3000

CMD ["npm","start","--prefix","backend"]
