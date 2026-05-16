#!/usr/bin/env sh
set -eu

env_file="${1:-.env}"
expected_ip="${VPS_IP:-}"

if [ -f "$env_file" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a
fi

: "${API_DOMAIN:?API_DOMAIN is required.}"
: "${ADMIN_DOMAIN:?ADMIN_DOMAIN is required.}"
: "${LOGS_DOMAIN:?LOGS_DOMAIN is required.}"

resolve_ips() {
  domain="$1"
  if command -v getent >/dev/null 2>&1; then
    getent ahostsv4 "$domain" | awk '{ print $1 }' | sort -u
  elif command -v nslookup >/dev/null 2>&1; then
    nslookup "$domain" | awk '/^Address: / { print $2 }' | tail -n +2 | sort -u
  else
    echo "Neither getent nor nslookup is available for DNS checks." >&2
    exit 1
  fi
}

for domain in "$API_DOMAIN" "$ADMIN_DOMAIN" "$LOGS_DOMAIN"; do
  ips="$(resolve_ips "$domain" || true)"
  if [ -z "$ips" ]; then
    echo "$domain does not resolve to an A record." >&2
    exit 1
  fi

  if [ -n "$expected_ip" ] && ! printf '%s\n' "$ips" | grep -Fx "$expected_ip" >/dev/null 2>&1; then
    echo "$domain resolves to [$(printf '%s' "$ips" | paste -sd ', ' -)], expected $expected_ip." >&2
    exit 1
  fi

  echo "$domain DNS OK: $(printf '%s' "$ips" | paste -sd ', ' -)"
done

echo "DNS preflight passed."
