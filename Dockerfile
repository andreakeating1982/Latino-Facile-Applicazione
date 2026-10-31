# Alternativa al runtime Node di render.yaml.
# Ricostruisce dai sorgenti: lo ZIP NON deve contenere dist/.
FROM node:22.22.2-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN corepack pnpm install --frozen-lockfile --prod=false
COPY . .
RUN corepack pnpm build

# Mantiene le patch e il lockfile; non modifica package.json per installare.
FROM build AS production-dependencies
RUN corepack pnpm prune --prod --ignore-scripts

FROM node:22.22.2-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
