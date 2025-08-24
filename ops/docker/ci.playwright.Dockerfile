FROM mcr.microsoft.com/playwright:v1.47.0-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["bash","-lc","npx playwright test tests/e2e/model-loading.spec.ts"]
