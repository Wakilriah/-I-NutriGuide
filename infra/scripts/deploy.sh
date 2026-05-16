#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.production.example to .env and fill production secrets first." >&2
  exit 1
fi

docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
infra/scripts/post-deploy.sh
