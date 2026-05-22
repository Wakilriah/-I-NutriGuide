#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.production.example to .env and fill production secrets first." >&2
  exit 1
fi

ENV_FILE=.env docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py migrate
ENV_FILE=.env docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py seed_all
ENV_FILE=.env docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py ensure_superuser
ENV_FILE=.env docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

echo "Post-deploy tasks completed: migrations, seed data, superuser, collectstatic."
