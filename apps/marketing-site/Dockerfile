# Build context is the repo root (Bun workspace) — see apps/marketing-site/nginx.conf
# for the runtime config. Dokploy: set Docker Context Path to "." and
# Dockerfile Path to "apps/marketing-site/Dockerfile".

FROM oven/bun:1.3.11 AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bunx turbo run build --filter=@chain-hub/marketing-site

FROM nginx:1.27-alpine AS runner
COPY --from=build /app/apps/marketing-site/dist /usr/share/nginx/html
COPY apps/marketing-site/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
