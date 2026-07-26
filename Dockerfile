# syntax=docker/dockerfile:1

# ── Build stage: compile the Vite app to static files ──
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies against the lockfile first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the static site (type-checks, then `vite build` → /app/dist).
COPY . .
RUN npm run build

# ── Serve stage: tiny nginx image serving the static bundle ──
FROM nginx:alpine AS serve

# SPA routing + correct MIME for the pdf.js .mjs worker.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy only the built assets — no Node, no source, no node_modules.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Basic container healthcheck (nginx serving the app).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
