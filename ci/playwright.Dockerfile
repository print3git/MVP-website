# Base image with Playwright system dependencies preinstalled
FROM node:20-bullseye

# Install required Playwright OS packages upfront so CI can skip network installs
RUN npx --yes playwright install-deps chromium
