# syntax=docker/dockerfile:1

# -------- builder stage
FROM node:20 AS builder

ARG HTTP_PROXY
ARG HTTPS_PROXY

WORKDIR /app

# Disable Husky and npm lifecycle scripts
ENV HUSKY=0 NPM_CONFIG_IGNORE_SCRIPTS=true

# -------- install root dependencies
COPY package.json package-lock.json ./
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true \
    && if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi \
    && npm ci --no-audit --no-fund

# -------- install backend dependencies
COPY backend/package.json backend/package-lock.json ./backend/
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true \
    && if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi \
    && npm ci --no-audit --no-fund --prefix backend

# -------- install hunyuan_server dependencies if present
COPY backend/hunyuan_server/package.json backend/hunyuan_server/package-lock.json ./backend/hunyuan_server/
RUN if [ -f backend/hunyuan_server/package-lock.json ]; then \
        unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true && \
        if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
        if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi && \
        npm ci --no-audit --no-fund --prefix backend/hunyuan_server; \
    fi

# -------- copy source and run CI
COPY . .
RUN npm run ci

# -------- prune dev dependencies
RUN npm prune --production \
    && npm prune --production --prefix backend \
    && if [ -f backend/hunyuan_server/package-lock.json ]; then npm prune --production --prefix backend/hunyuan_server; fi

# -------- runtime stage
FROM node:20

ARG HTTP_PROXY
ARG HTTPS_PROXY

WORKDIR /app

ENV HUSKY=0 NPM_CONFIG_IGNORE_SCRIPTS=true

RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true

# Copy production dependencies and built app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json /app/backend/package-lock.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/hunyuan_server/package.json /app/backend/hunyuan_server/package-lock.json ./backend/hunyuan_server/
COPY --from=builder /app/backend/hunyuan_server/node_modules ./backend/hunyuan_server/node_modules

COPY --from=builder /app .

EXPOSE 3000

CMD ["npm","start","--prefix","backend"]
