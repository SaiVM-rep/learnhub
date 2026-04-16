# ── LearnHub Frontend Dockerfile ─────────────────────────────────
# Multi-stage build: Node builds the React app, Nginx serves it

# ---------- Stage 1: Build the React app ----------
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests first (better Docker layer caching)
COPY package.json package-lock.json ./

# Clean install from lockfile for reproducibility
RUN npm ci --silent

# Copy the rest of the source code
COPY . .

# Build the production bundle
RUN npm run build

# ---------- Stage 2: Serve with Nginx ----------
FROM nginx:alpine AS production

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom Nginx config for SPA routing + API proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
