#!/usr/bin/env sh
set -eu

PROJECT_ID="${GCLOUD_PROJECT_ID:-project-8305edbf-84b6-47c6-834}"
ZONE="${GCLOUD_ZONE:-europe-west9-b}"
INSTANCE="${GCLOUD_INSTANCE:-serveur}"
REMOTE_PATH="${REMOTE_PATH:-~/project}"
LOCAL_DUMP="${LOCAL_DUMP:-/tmp/opencode/inutriguide-prod-devsync.sql.gz}"
REMOTE_DUMP="${REMOTE_DUMP:-/tmp/inutriguide-prod-devsync.sql.gz}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"

mkdir -p "$(dirname "$LOCAL_DUMP")"

echo "Creating production database dump on ${INSTANCE}..."
gcloud compute ssh "$INSTANCE" \
  --project "$PROJECT_ID" \
  --zone "$ZONE" \
  --command "cd $REMOTE_PATH && docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres sh -c 'pg_dump -U \$POSTGRES_USER -d \$POSTGRES_DB --clean --if-exists --no-owner --no-privileges' | gzip > '$REMOTE_DUMP'"

echo "Copying production dump to ${LOCAL_DUMP}..."
gcloud compute scp "$INSTANCE:$REMOTE_DUMP" "$LOCAL_DUMP" \
  --project "$PROJECT_ID" \
  --zone "$ZONE"

echo "Starting local database dependencies..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis neo4j

echo "Stopping local app services during restore..."
docker compose -f "$COMPOSE_FILE" stop backend celery_worker celery_beat admin_panel landing_page mobile_app || true

echo "Resetting local public schema..."
docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'

echo "Restoring production dump into local database..."
gunzip -c "$LOCAL_DUMP" | docker compose -f "$COMPOSE_FILE" exec -T postgres sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -v ON_ERROR_STOP=1'

echo "Starting local backend and admin panel..."
docker compose -f "$COMPOSE_FILE" up -d backend admin_panel

echo "Local database sync completed."
