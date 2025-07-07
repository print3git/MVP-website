FROM node:18-alpine
COPY backend/ /app/backend/
WORKDIR /app/backend
RUN npm ci
CMD ["npm","start"]
