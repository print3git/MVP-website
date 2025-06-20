FROM node:20
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json backend/
COPY backend/hunyuan_server/package*.json backend/hunyuan_server/
COPY . .
RUN npm ci && npm ci --prefix backend && if [ -f backend/hunyuan_server/package.json ]; then npm ci --prefix backend/hunyuan_server; fi
RUN npm run ci
CMD ["npm", "start", "--prefix", "backend"]
