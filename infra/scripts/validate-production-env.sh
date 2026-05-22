#!/usr/bin/env sh
set -eu

env_file="${1:-.env}"

if [ ! -f "$env_file" ]; then
  echo "Missing $env_file. Copy .env.production.example to .env and fill production values first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$env_file"
set +a

required_vars="
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
REDIS_URL
DJANGO_SECRET_KEY
DJANGO_SECURE_SSL_REDIRECT
DJANGO_SECURE_HSTS_SECONDS
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS
DJANGO_SECURE_HSTS_PRELOAD
DJANGO_ALLOWED_HOSTS
CORS_ALLOWED_ORIGINS
CSRF_TRUSTED_ORIGINS
API_HOST
ADMIN_HOST
DOZZLE_HOST
NEO4J_HOST
VITE_API_BASE_URL
EXPO_PUBLIC_API_BASE_URL
TRAEFIK_ACME_EMAIL
DOCKER_IMAGE_NAMESPACE
IMAGE_TAG
ADMIN_EMAIL
ADMIN_NAME
ADMIN_PASSWORD
DOZZLE_BASIC_AUTH
"

for key in $required_vars; do
  eval "value=\${$key:-}"
  if [ -z "$value" ]; then
    echo "$key is required in $env_file." >&2
    exit 1
  fi
  case "$value" in
    *yourdomain.com*|*replace_with*|*with-real*|*your-password*)
      echo "$key still contains a placeholder value." >&2
      exit 1
      ;;
  esac
done

if [ "${DJANGO_DEBUG:-}" != "False" ]; then
  echo "DJANGO_DEBUG must be False in production." >&2
  exit 1
fi
case "$VITE_API_BASE_URL" in
  https://*)
    if [ "${DJANGO_SECURE_SSL_REDIRECT:-}" != "True" ]; then
      echo "DJANGO_SECURE_SSL_REDIRECT must be True when using HTTPS." >&2
      exit 1
    fi
    if [ "${DJANGO_SECURE_HSTS_SECONDS:-0}" -lt 31536000 ]; then
      echo "DJANGO_SECURE_HSTS_SECONDS must be at least 31536000 when using HTTPS." >&2
      exit 1
    fi
    if [ "${DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS:-}" != "True" ]; then
      echo "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS must be True when using HTTPS." >&2
      exit 1
    fi
    expected_scheme="https"
    ;;
  http://*)
    expected_scheme="http"
    if [ "${DJANGO_SECURE_SSL_REDIRECT:-}" != "False" ]; then
      echo "DJANGO_SECURE_SSL_REDIRECT must be False when serving by bare IP over HTTP." >&2
      exit 1
    fi
    ;;
  *)
    echo "VITE_API_BASE_URL must start with http:// or https://." >&2
    exit 1
    ;;
esac

secret_unique_chars="$(printf '%s' "$DJANGO_SECRET_KEY" | fold -w1 | sort -u | wc -l | tr -d ' ')"
if [ "${#DJANGO_SECRET_KEY}" -lt 50 ] || [ "$secret_unique_chars" -lt 20 ]; then
  echo "DJANGO_SECRET_KEY must be at least 50 characters with high entropy." >&2
  exit 1
fi

case "$TRAEFIK_ACME_EMAIL" in
  *@*.*) ;;
  *) echo "TRAEFIK_ACME_EMAIL must be a valid email address for Let's Encrypt notices." >&2; exit 1 ;;
esac

expected_api_base="${expected_scheme}://${API_HOST}/api/v1"
if [ "${VITE_API_BASE_URL%/}" != "$expected_api_base" ]; then
  echo "VITE_API_BASE_URL must be $expected_api_base." >&2
  exit 1
fi
if [ "${EXPO_PUBLIC_API_BASE_URL%/}" != "$expected_api_base" ]; then
  echo "EXPO_PUBLIC_API_BASE_URL must be $expected_api_base." >&2
  exit 1
fi

case "$CORS_ALLOWED_ORIGINS" in
  *"${expected_scheme}://${ADMIN_HOST}"*) ;;
  *) echo "CORS_ALLOWED_ORIGINS must include ${expected_scheme}://${ADMIN_HOST}." >&2; exit 1 ;;
esac

case "$CSRF_TRUSTED_ORIGINS" in
  *"${expected_scheme}://${API_HOST}"*"${expected_scheme}://${ADMIN_HOST}"*|*"${expected_scheme}://${ADMIN_HOST}"*"${expected_scheme}://${API_HOST}"*) ;;
  *) echo "CSRF_TRUSTED_ORIGINS must include ${expected_scheme}://${API_HOST} and ${expected_scheme}://${ADMIN_HOST}." >&2; exit 1 ;;
esac

echo "Production env validation passed: $env_file"
