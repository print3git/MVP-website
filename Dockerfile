FROM node:20 AS builder
WORKDIR /app

# Proxy support
ARG HTTP_PROXY
ARG HTTPS_PROXY

# Install root dependencies
COPY package.json package-lock.json ./
RUN if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi \
    && npm config set ignore-scripts true \
    && npm install \
    && npm ci --omit=dev

# Install backend dependencies
COPY backend/package.json backend/package-lock.json ./backend/
RUN if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi \
    && cd backend \
    && npm config set ignore-scripts true \
    && npm install \
    && npm ci --omit=dev

# Copy remaining source and run CI
COPY . .
RUN npm run ci

FROM node:20 AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app ./

CMD ["npm", "start", "--prefix", "backend"]
