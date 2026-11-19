# Build desde la raíz del repo: docker build -f apps/web/Dockerfile -t nexotalent-web .
FROM node:24-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w @nexo/web --include-workspace-root=false --no-audit --no-fund
COPY apps/web apps/web
RUN npm run build -w @nexo/web

# nginx sin privilegios (escucha en 8080): sirve la SPA y reenvía /v1 y /health a la API.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
