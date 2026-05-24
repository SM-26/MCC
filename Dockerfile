# Build stage
FROM node:26-alpine AS builder

WORKDIR /app

# Enable corepack to use pnpm (no need to npm install -g)
RUN corepack enable

# Install pnpm globally
# RUN npm install -g pnpm

# Copy package files
# COPY package*.json ./
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build with Vite
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
