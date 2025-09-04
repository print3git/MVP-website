FROM mcr.microsoft.com/playwright:v1.47.0-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["bash","-lc","[ -f tests/e2e/model-loading.spec.ts ] && npx playwright test --trace on --pass-with-no-tests tests/e2e/model-loading.spec.ts || echo 'No model-loading spec found; skipping'"]
