# Build context is the repo root (Bun workspace) — see apps/docs/nginx.conf
# for the runtime config. Built with vite base "/docs/", served under that
# same path prefix. Dokploy: set Docker Context Path to "." and Dockerfile
# Path to "apps/docs/Dockerfile", with the app's domain path set to /docs.

FROM oven/bun:1.3.11 AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bunx turbo run build --filter=@chain-hub/docs

FROM nginx:1.27-alpine AS runner
COPY --from=build /app/apps/docs/dist /usr/share/nginx/html/docs
COPY apps/docs/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
