#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.production.example to .env and fill production secrets first." >&2
  exit 1
fi

docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py migrate
docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py seed_all
docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py ensure_superuser
docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

echo "Post-deploy tasks completed: migrations, seed data, superuser, collectstatic."
