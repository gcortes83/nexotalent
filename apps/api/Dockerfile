# Build desde la raíz del repo: docker build -f apps/api/Dockerfile -t nexotalent-api .
# La misma imagen sirve la API (CMD por defecto) y ejecuta migraciones/seed:
#   docker run --rm -e DATABASE_URL=… nexotalent-api dist/cli/db.js migrate seed
FROM node:24-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w @nexo/api --include-workspace-root=false --no-audit --no-fund
COPY apps/api apps/api
RUN npm run build -w @nexo/api && npm prune --omit=dev -w @nexo/api --no-audit --no-fund

FROM gcr.io/distroless/nodejs24-debian12:nonroot
WORKDIR /app
ENV NODE_ENV=production PORT=4000 HOST=0.0.0.0
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/migrations ./migrations
COPY --from=build /repo/apps/api/package.json ./
EXPOSE 4000
USER nonroot
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["dist/main.js"]
