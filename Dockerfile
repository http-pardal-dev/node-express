# Development and test image for the node-express server.
#
# The image carries the toolchain and the dependencies of package-lock.json; the
# repository itself is bind-mounted over /app by docker-compose.yml, so the code
# that runs is always the working tree. The result is the same environment
# everywhere: the Node of .node-version, the exact tree of `npm ci`, and the
# same commands the CI runs (prisma migrate deploy, jest, eslint, npm audit).
#
#   docker compose build            # once, and again after package-lock.json changes
#   docker compose up dev           # migrate + server on http://127.0.0.1:3000
#   docker compose run --rm test    # migrate + the Jest suite
#
# NODE_VERSION mirrors .node-version. The CI matrix (20, 22, 24) can be
# reproduced with: docker compose build --build-arg NODE_VERSION=20

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base

# OpenSSL for the Prisma engines (the -slim image ships without libssl3) and
# ca-certificates for HTTPS (the npm registry, the Prisma engine downloads).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# npm never rewrites the lockfile or the audit config on its own: the install
# fails when package.json and package-lock.json disagree, which is what the CI
# does with `npm ci`.
ENV APP_ENV=development

FROM base AS deps

COPY package.json package-lock.json ./

# `npm ci` installs the exact locked tree, dev dependencies included, so the
# image can migrate, test and lint. The Prisma Client is generated against the
# schema checked into the repository (schema.prisma without the client fails at
# runtime, and the engine download is what needs the network).
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci \
    && npx prisma generate \
    && npm cache clean --force

FROM deps AS dev

# Migrations first: the server refuses to boot against a database without
# tables (config/initializers/database.js), so a fresh container has to migrate
# before it can listen. The server reads HOST from the environment (see
# config/boot.js); the compose file sets HOST=0.0.0.0 so Node binds every
# interface *inside* the container, which no published port can reach, and
# publishes it on 127.0.0.1 of the host only, so the API keeps the
# loopback-only guarantee described in config/boot.js.
CMD ["sh", "-c", "npm run db:deploy && exec npm start"]
