FROM node:20
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json backend/
COPY backend/hunyuan_server/package*.json backend/hunyuan_server/
COPY . .
RUN set -e; \
    for dir in . backend backend/hunyuan_server; do \
      if [ -f "$dir/package.json" ] && [ -f "$dir/package-lock.json" ]; then \
        npm ci --prefix "$dir" || (cd "$dir" && npm install && cd - && npm ci --prefix "$dir"); \
      fi; \
    done
RUN npm run ci
CMD ["npm", "start", "--prefix", "backend"]
