ARG NODE_IMAGE=node:20.15.1-alpine3.20

FROM $NODE_IMAGE AS base

WORKDIR /app

# Only essential packages
RUN apk --no-cache add \
    dumb-init

RUN mkdir -p /app && chown node:node /app
USER node

# ---------- BUILD STAGE ----------
FROM base AS build

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build && npm prune --production

# ---------- PRODUCTION STAGE ----------
FROM base AS production

WORKDIR /app
ENV APP_PORT=8080

COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist

EXPOSE $APP_PORT
CMD ["dumb-init", "node", "dist/src/main"]