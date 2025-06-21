# syntax=docker/dockerfile:1

### Builder stage
FROM node:20 AS builder
WORKDIR /app

ARG HTTP_PROXY
ARG HTTPS_PROXY

ENV HUSKY=0 NPM_CONFIG_IGNORE_SCRIPTS=true

COPY package.json package-lock.json ./
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi && \
    npm ci --omit=dev

COPY backend/package.json backend/package-lock.json ./backend/
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi && \
    npm ci --omit=dev --prefix backend

COPY backend/hunyuan_server/package.json backend/hunyuan_server/package-lock.json ./backend/hunyuan_server/
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi && \
    npm ci --omit=dev --prefix backend/hunyuan_server

COPY . .
RUN npm run ci

### Runner stage
FROM node:20 AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/hunyuan_server/node_modules ./backend/hunyuan_server/node_modules

COPY . .

CMD ["npm","start","--prefix","backend"]
