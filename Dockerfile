# One image for the whole site: the React build is served by the API (STATIC_DIR), so the app, the API and the
# refresh cookie share one origin.

# 1. Build the frontend.
FROM node:26-alpine AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. The API with production dependencies only, plus the built frontend.
FROM node:26-alpine
ENV NODE_ENV=production \
    PORT=4000 \
    STATIC_DIR=/app/public
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY backend/ ./
COPY --from=web /app/frontend/dist /app/public
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1
CMD ["node", "src/server.js"]
