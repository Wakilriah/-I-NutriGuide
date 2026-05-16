#!/usr/bin/env sh
set -eu

repo_url="${REPO_URL:-}"
app_dir="${APP_DIR:-/opt/inutriguide}"
deploy_user="${DEPLOY_USER:-root}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root or with sudo." >&2
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This bootstrap script supports Ubuntu/Debian VPS hosts with apt-get." >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl git ufw

install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

mkdir -p "$app_dir"
if [ -n "$repo_url" ] && [ ! -d "$app_dir/.git" ]; then
  git clone "$repo_url" "$app_dir"
fi

if [ "$deploy_user" != "root" ]; then
  usermod -aG docker "$deploy_user"
  chown -R "$deploy_user:$deploy_user" "$app_dir"
fi

echo "VPS bootstrap completed."
echo "Next: copy .env to $app_dir/.env, then run infra/scripts/deploy.sh from $app_dir."
