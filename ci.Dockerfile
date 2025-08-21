# CI base image built on node:20-slim with essential tools
FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends git jq \
    && npm install -g npm@latest \
    && rm -rf /var/lib/apt/lists/*
