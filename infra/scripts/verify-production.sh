#!/usr/bin/env sh
set -eu

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

: "${API_DOMAIN:?API_DOMAIN is required.}"
: "${ADMIN_DOMAIN:?ADMIN_DOMAIN is required.}"
: "${LOGS_DOMAIN:?LOGS_DOMAIN is required.}"
: "${EXPO_PUBLIC_API_BASE_URL:?EXPO_PUBLIC_API_BASE_URL is required.}"

check_status() {
  name="$1"
  url="$2"
  expected="$3"
  status="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"

  case ",$expected," in
    *,"$status",*)
      echo "$name OK ($status): $url"
      ;;
    *)
      echo "$name check failed for $url. Expected one of [$expected], got $status." >&2
      exit 1
      ;;
  esac
}

check_status "API health" "https://${API_DOMAIN}/api/v1/health/" "200"
check_status "Admin" "https://${ADMIN_DOMAIN}/" "200"
check_status "Dozzle protection" "https://${LOGS_DOMAIN}/" "401,403"

expected_mobile_url="https://${API_DOMAIN}/api/v1"
if [ "${EXPO_PUBLIC_API_BASE_URL%/}" != "$expected_mobile_url" ]; then
  echo "Mobile API URL mismatch. Expected EXPO_PUBLIC_API_BASE_URL=${expected_mobile_url}, got ${EXPO_PUBLIC_API_BASE_URL}." >&2
  exit 1
fi
echo "Mobile API URL OK: ${EXPO_PUBLIC_API_BASE_URL}"

echo "Production domain verification passed."
