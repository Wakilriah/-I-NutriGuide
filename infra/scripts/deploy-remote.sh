#!/usr/bin/env sh
set -eu

host=""
user="root"
remote_path="/opt/inutriguide"
env_file=".env"
key_file=""
skip_env_upload="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --host)
      host="$2"
      shift 2
      ;;
    --user)
      user="$2"
      shift 2
      ;;
    --remote-path)
      remote_path="$2"
      shift 2
      ;;
    --env-file)
      env_file="$2"
      shift 2
      ;;
    --key-file)
      key_file="$2"
      shift 2
      ;;
    --skip-env-upload)
      skip_env_upload="true"
      shift 1
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [ -z "$host" ]; then
  echo "Usage: deploy-remote.sh --host VPS_HOST [--user root] [--remote-path /opt/inutriguide] [--env-file .env] [--key-file ~/.ssh/id_ed25519] [--skip-env-upload]" >&2
  exit 1
fi

target="${user}@${host}"
ssh_args=""

if [ -n "$key_file" ]; then
  ssh_args="-i $key_file"
fi

if [ "$skip_env_upload" != "true" ]; then
  if [ ! -f "$env_file" ]; then
    echo "Missing $env_file. Copy .env.production.example to .env and fill production values first." >&2
    exit 1
  fi
  # shellcheck disable=SC2086
  scp $ssh_args "$env_file" "${target}:${remote_path}/.env"
fi

# shellcheck disable=SC2086
ssh $ssh_args "$target" "set -eu
cd '$remote_path'
git pull --ff-only
chmod +x infra/scripts/*.sh
infra/scripts/validate-production-env.sh
docker compose --env-file .env -f docker-compose.prod.yml config --quiet
infra/scripts/deploy.sh
infra/scripts/verify-production.sh"

echo "Remote deployment completed on $target."
