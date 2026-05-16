# DevOps and Deployment Guide

## Infrastructure Stack

- Docker
- Docker Compose
- Traefik reverse proxy
- Dozzle log viewer
- PostgreSQL
- Redis
- Django backend
- Celery worker
- Celery beat
- React/Vite admin panel
- VPS deployment

## Services

```txt
traefik
backend
postgres
redis
celery_worker
celery_beat
admin_panel
dozzle
```

## Domains

Recommended production domains:

```txt
api.yourdomain.com      -> Django API
admin.yourdomain.com    -> React admin panel
logs.yourdomain.com     -> Dozzle logs
traefik.yourdomain.com  -> Traefik dashboard, optional and protected
```

## Docker Compose Development

Development compose should run:

- PostgreSQL
- Redis
- Backend
- Celery worker
- Admin panel
- Dozzle

Traefik can be included in dev or added in prod only.

## Backend Dockerfile Requirements

The backend Dockerfile should:

1. Use official Python image.
2. Install system dependencies for psycopg.
3. Install Python requirements.
4. Copy source code.
5. Run collectstatic for prod image if needed.
6. Run gunicorn in production.

## Admin Dockerfile Requirements

The admin Dockerfile should:

1. Use Node image for build stage.
2. Install dependencies.
3. Build Vite app.
4. Serve static build with Nginx or a minimal static server.

## Mobile App

Do not containerize the Expo mobile app for production unless needed. It is developed locally and connects to the API endpoint.

## Production Compose Requirements

Production compose must include:

- Traefik with HTTPS
- Backend behind Traefik
- Admin behind Traefik
- Dozzle behind Traefik and protected
- PostgreSQL volume
- Redis volume or ephemeral cache
- Django static/media volume if needed

## Dozzle

Dozzle is used for browser-based Docker logs.

It should be available at:

```txt
https://logs.yourdomain.com
```

Security requirement:

- Dozzle must not be publicly exposed without protection.
- Use Traefik Basic Auth, IP whitelist, VPN, or Cloudflare Access.
- For this project, use Traefik Basic Auth.

## Traefik Requirements

Traefik should handle:

- HTTPS certificates
- Reverse proxy routing
- Redirect HTTP to HTTPS
- Basic Auth for Dozzle and optionally dashboard

## Example Routing

```txt
Host(`api.yourdomain.com`) -> backend:8000
Host(`admin.yourdomain.com`) -> admin_panel:80
Host(`logs.yourdomain.com`) -> dozzle:8080, protected by Basic Auth
```

## Environment Variables

Production `.env` must include:

```env
DJANGO_SECRET_KEY=
DJANGO_DEBUG=False
DJANGO_SECURE_SSL_REDIRECT=True
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=True
DJANGO_SECURE_HSTS_PRELOAD=False
DJANGO_ALLOWED_HOSTS=api.yourdomain.com
DATABASE_URL=postgres://user:password@postgres:5432/inutriguide
REDIS_URL=redis://redis:6379/0
CORS_ALLOWED_ORIGINS=https://admin.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://api.yourdomain.com,https://admin.yourdomain.com
POSTGRES_DB=inutriguide
POSTGRES_USER=inutriguide
POSTGRES_PASSWORD=
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
TRAEFIK_ACME_EMAIL=ops@yourdomain.com
DOZZLE_BASIC_AUTH=admin:$$apr1$$replace$$with-real-htpasswd-hash
```

`VITE_API_BASE_URL` is passed as a Docker build argument to the admin panel image, so it must be correct before running `docker compose up --build`.

## Deployment Flow

```txt
1. SSH into VPS
2. Clone repository
3. Copy `.env.production.example` to `.env`
4. Configure DNS records
5. Start Docker Compose production
6. Run migrations
7. Seed initial data
8. Create Django superuser
9. Verify API health endpoint
10. Verify admin login
11. Verify Dozzle login
12. Verify mobile app can call API endpoint
```

For a fresh Ubuntu VPS, bootstrap Docker, Compose, firewall ports, and the app directory:

```sh
REPO_URL=https://github.com/your-org/your-repo.git APP_DIR=/opt/inutriguide infra/scripts/bootstrap-vps.sh
```

or from Windows/PowerShell:

```powershell
infra/scripts/bootstrap-vps.ps1 -HostName your.vps.ip -User root -RemotePath /opt/inutriguide -RepoUrl https://github.com/your-org/your-repo.git
```

Before deployment, confirm DNS records resolve to the VPS:

```powershell
$env:VPS_IP="203.0.113.10"
infra/scripts/check-dns.ps1
```

or:

```sh
VPS_IP=203.0.113.10 infra/scripts/check-dns.sh
```

The deployment scripts now group steps 5-8:

```sh
infra/scripts/validate-production-env.sh
infra/scripts/deploy.sh
```

or on Windows/PowerShell:

```powershell
infra/scripts/validate-production-env.ps1
infra/scripts/deploy.ps1
```

If the repository is already cloned on the VPS, deploy from your local machine over SSH:

```powershell
infra/scripts/deploy-remote.ps1 -HostName your.vps.ip -User root -RemotePath /opt/inutriguide -EnvFile .env
```

or from a Unix shell:

```sh
infra/scripts/deploy-remote.sh --host your.vps.ip --user root --remote-path /opt/inutriguide --env-file .env
```

The remote script uploads `.env`, runs `git pull --ff-only`, validates production env values, deploys the stack, runs post-deploy tasks, and verifies the live domains.

If the stack is already running and you only need to rerun migrations, seed data, superuser creation, and static collection:

```sh
infra/scripts/post-deploy.sh
```

Set these in `.env` before running post-deploy:

```env
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_NAME=I-NutriGuide Admin
ADMIN_PASSWORD=replace_with_strong_admin_password
```

The production superuser command is idempotent: it creates the admin if missing and updates the password/staff flags if it already exists.

Verify live domains:

```sh
API_DOMAIN=api.yourdomain.com ADMIN_DOMAIN=admin.yourdomain.com LOGS_DOMAIN=logs.yourdomain.com infra/scripts/verify-production.sh
```

or:

```powershell
$env:API_DOMAIN="api.yourdomain.com"
$env:ADMIN_DOMAIN="admin.yourdomain.com"
$env:LOGS_DOMAIN="logs.yourdomain.com"
infra/scripts/verify-production.ps1
```

## Health Checks

Add endpoints:

```txt
GET /api/v1/health/
```

Response:

```json
{
  "status": "ok",
  "database": "ok",
  "redis": "ok"
}
```

Docker health checks should verify:

- Backend health endpoint
- PostgreSQL readiness
- Redis readiness

## Backup Strategy

Scripts:

```txt
infra/scripts/backup-db.sh
infra/scripts/restore-db.sh
infra/scripts/backup-db.ps1
infra/scripts/restore-db.ps1
```

Backup command:

```sh
infra/scripts/backup-db.sh
```

PowerShell restore command:

```powershell
make restore-db BACKUP=backups/inutriguide-YYYYMMDD-HHMMSS.sql
```

## Log Strategy

Use:

- Docker logs for all containers
- Dozzle for UI log access
- Django structured console logs
- Celery logs through Docker

## Production Checklist

- [ ] DNS records configured
- [ ] HTTPS works
- [ ] API is reachable
- [ ] Admin panel is reachable
- [ ] Dozzle is protected
- [ ] Database migrations applied
- [ ] Seed data loaded
- [ ] Superuser created
- [ ] CORS configured
- [ ] Mobile app API URL configured
- [ ] Health endpoint passes
