# syntax=docker/dockerfile:1

### Builder stage
FROM node:20 AS builder
WORKDIR /app

# Accept proxy build arguments
ARG HTTP_PROXY
ARG HTTPS_PROXY

# Disable Husky hooks and npm lifecycle scripts
ENV HUSKY=0 NPM_CONFIG_IGNORE_SCRIPTS=true

# Install root dependencies
COPY package.json package-lock.json ./
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi && \
    npm install && npm ci --omit=dev

# Install backend dependencies
COPY backend/package.json backend/package-lock.json ./backend/
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi && \
    npm install --prefix backend && npm ci --omit=dev --prefix backend

# Install hunyuan_server dependencies
COPY backend/hunyuan_server/package.json backend/hunyuan_server/package-lock.json ./backend/hunyuan_server/
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi && \
    npm install --prefix backend/hunyuan_server && npm ci --omit=dev --prefix backend/hunyuan_server

# Copy the rest of the source and run the build script
COPY . .
RUN npm run ci

### Runtime stage
FROM node:20 AS runner
WORKDIR /app

# Accept the same proxy build arguments
ARG HTTP_PROXY
ARG HTTPS_PROXY

# Disable lifecycle scripts during install
ENV HUSKY=0 NPM_CONFIG_IGNORE_SCRIPTS=true

# Configure npm proxy if provided
RUN unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi

# Bring over built source and install production deps
COPY --from=builder /app .
RUN npm ci --only=production && npm ci --only=production --prefix backend && npm ci --only=production --prefix backend/hunyuan_server

# Start the backend by default
CMD ["npm","start","--prefix","backend"]
