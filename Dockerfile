FROM node:20
WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Install backend dependencies
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --only=production --prefix backend

# Copy remaining source files
COPY . .

CMD ["npm", "start", "--prefix", "backend"]
