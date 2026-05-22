#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.production.example to .env and fill production secrets first." >&2
  exit 1
fi

ENV_FILE=.env docker compose --env-file .env -f docker-compose.prod.yml pull
ENV_FILE=.env docker compose --env-file .env -f docker-compose.prod.yml up -d
infra/scripts/post-deploy.sh
