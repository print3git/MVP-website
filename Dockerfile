FROM node:20

# Accept optional proxy args
ARG HTTP_PROXY
ARG HTTPS_PROXY
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}

WORKDIR /app

# Install root production dependencies while skipping lifecycle scripts
COPY package.json package-lock.json ./
RUN if [ -n "$HTTP_PROXY" ]; then npm config set proxy $HTTP_PROXY; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy $HTTPS_PROXY; fi \
    && HUSKY=0 npm_config_ignore_scripts=true npm ci --omit=dev

# Install backend production dependencies
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN if [ -n "$HTTP_PROXY" ]; then npm config set proxy $HTTP_PROXY; fi \
    && if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy $HTTPS_PROXY; fi \
    && HUSKY=0 npm_config_ignore_scripts=true npm ci --omit=dev

# Copy the rest of the source
WORKDIR /app
COPY . .

# Run CI script
RUN npm run ci

CMD ["npm", "start", "--prefix", "backend"]
