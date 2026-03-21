#!/bin/sh
set -eu

echo "Ensuring dependencies are installed..."
node ./scripts/ensure-node-modules.mjs

echo "Waiting for PostgreSQL..."
node ./scripts/wait-for-postgres.mjs

echo "Generating Prisma Client..."
npm run db:generate

echo "Applying Prisma migrations..."
npm run db:deploy

if [ "${SEED_ON_START:-true}" = "true" ]; then
  echo "Checking seed state..."
  node ./scripts/seed-if-empty.mjs
fi

echo "Starting Next.js..."
npm run dev -- --hostname 0.0.0.0
