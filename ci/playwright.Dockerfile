# Base image with Playwright and required system libraries preinstalled
FROM mcr.microsoft.com/playwright:v1.54.0-jammy

# Ensure Chromium dependencies are installed during image build
RUN npx --yes playwright install-deps chromium
