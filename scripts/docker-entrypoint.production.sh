#!/bin/sh
set -eu

echo "Starting Makerventory production container..."

if [ "${RUN_DB_MIGRATIONS:-false}" = "true" ]; then
  echo "Applying Prisma migrations..."
  npm run db:deploy
fi

echo "Starting Next.js production server..."
exec npm run start -- --hostname 0.0.0.0 --port "${PORT:-3000}"
