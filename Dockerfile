# syntax=docker/dockerfile:1

# -------- builder stage
FROM node:20 AS builder

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG SKIP_TESTS=0

WORKDIR /app

# Disable Husky and npm lifecycle scripts
ENV HUSKY=0 NPM_CONFIG_IGNORE_SCRIPTS=true

# Install Docker CLI for development tasks
RUN apt-get update \
    && apt-get install -y --no-install-recommends docker.io \
    && rm -rf /var/lib/apt/lists/*

# --- Install PNPM once and use it everywhere ---
RUN corepack enable && corepack prepare pnpm@8.15.6 --activate
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# ------------------------------------------------

# Install deps with PNPM (strict, reproducible)
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# -------- install backend dependencies
COPY backend/pnpm-lock.yaml backend/package.json ./backend/
RUN pnpm --filter backend... install --frozen-lockfile --ignore-scripts

# -------- copy source and run CI
COPY . .
RUN [ "$SKIP_TESTS" = "1" ] || pnpm run ci

# -------- prune dev dependencies
RUN pnpm prune --prod \
    && pnpm prune --prod --filter ./backend

# -------- runtime stage
FROM node:20

ARG HTTP_PROXY
ARG HTTPS_PROXY

WORKDIR /app

ENV HUSKY=0 NPM_CONFIG_IGNORE_SCRIPTS=true

RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true

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
