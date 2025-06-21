FROM node:20
WORKDIR /app
# Configure npm proxy settings if HTTP_PROXY/HTTPS_PROXY are provided
ARG HTTP_PROXY
ARG HTTPS_PROXY
RUN unset NPM_CONFIG_http-proxy npm_config_http-proxy NPM_CONFIG_https-proxy npm_config_https-proxy || true && \
    if [ -n "$HTTP_PROXY" ]; then npm config set proxy "$HTTP_PROXY"; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy "$HTTPS_PROXY"; fi

COPY package*.json ./
COPY backend/package*.json backend/
COPY backend/hunyuan_server/package*.json backend/hunyuan_server/
COPY . .
RUN set -e; \
    for dir in . backend backend/hunyuan_server; do \
      if [ -f "$dir/package.json" ] && [ -f "$dir/package-lock.json" ]; then \
        npm ci --prefix "$dir" || (cd "$dir" && npm install && cd - && npm ci --prefix "$dir"); \
        if grep -q '@playwright/test' "$dir/package.json" || grep -q '"playwright"' "$dir/package.json"; then \
          npx --yes --prefix "$dir" playwright install --with-deps; \
        fi; \
      fi; \
    done
RUN npm run ci
CMD ["npm", "start", "--prefix", "backend"]
