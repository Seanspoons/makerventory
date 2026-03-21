#!/bin/sh
set -eu

echo "Ensuring dependencies are installed..."
node ./scripts/ensure-node-modules.mjs

echo "Waiting for PostgreSQL..."
node ./scripts/wait-for-postgres.mjs

echo "Generating Prisma Client..."
npm run db:generate

echo "Applying Prisma migrations..."
node ./scripts/apply-migrations.mjs

echo "Starting Next.js..."
npm run dev -- --hostname 0.0.0.0
