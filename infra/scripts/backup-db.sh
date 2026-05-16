#!/usr/bin/env sh
set -eu

mkdir -p backups
timestamp="$(date +%Y%m%d-%H%M%S)"
docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "backups/inutriguide-${timestamp}.sql"
echo "Database backup written to backups/inutriguide-${timestamp}.sql"
