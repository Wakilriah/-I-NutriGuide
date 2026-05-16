ENV_FILE ?= .env.production.example

.PHONY: dev start-local down logs test test-backend test-admin test-mobile lint migrate seed seed-demo schema prod-config smoke-stack check-traefik-routes check-dns check-secrets backup-db restore-db bootstrap-vps deploy deploy-remote post-deploy validate-production-env verify-production

dev:
	docker compose -f docker-compose.dev.yml up --build

start-local:
	powershell -ExecutionPolicy Bypass -File infra/scripts/start-local-dev.ps1

down:
	docker compose -f docker-compose.dev.yml down

logs:
	docker compose -f docker-compose.dev.yml logs -f

test: test-backend test-admin test-mobile

test-backend:
	docker compose -f docker-compose.dev.yml run --rm backend python -m pytest

test-admin:
	cd apps/admin-panel && npm run test

test-mobile:
	cd apps/mobile-app && npm run test -- --runInBand

lint:
	docker compose -f docker-compose.dev.yml run --rm backend ruff check .
	cd apps/admin-panel && npm run lint

migrate:
	docker compose -f docker-compose.dev.yml exec backend python manage.py migrate

seed:
	docker compose -f docker-compose.dev.yml exec backend python manage.py seed_all

seed-demo:
	docker compose -f docker-compose.dev.yml exec backend python manage.py seed_demo

schema:
	docker compose -f docker-compose.dev.yml exec backend python manage.py spectacular --file /app/openapi.yaml
	powershell -ExecutionPolicy Bypass -Command "Move-Item -Force apps/backend/openapi.yaml docs/openapi.yaml"

prod-config:
	docker compose --env-file $(ENV_FILE) -f docker-compose.prod.yml config

smoke-stack:
	powershell -ExecutionPolicy Bypass -File infra/scripts/smoke-stack.ps1

check-traefik-routes:
	powershell -ExecutionPolicy Bypass -File infra/scripts/check-traefik-routes.ps1

check-dns:
	powershell -ExecutionPolicy Bypass -File infra/scripts/check-dns.ps1

check-secrets:
	powershell -ExecutionPolicy Bypass -File infra/scripts/check-secrets.ps1

backup-db:
	powershell -ExecutionPolicy Bypass -File infra/scripts/backup-db.ps1

restore-db:
	@if [ -z "$(BACKUP)" ]; then echo "BACKUP is required. Usage: make restore-db BACKUP=backups/inutriguide-YYYYMMDD-HHMMSS.sql"; exit 1; fi
	powershell -ExecutionPolicy Bypass -File infra/scripts/restore-db.ps1 -BackupPath "$(BACKUP)"

bootstrap-vps:
	@if [ -z "$(HOST)" ]; then echo "HOST is required. Usage: make bootstrap-vps HOST=your.vps.ip REPO_URL=https://github.com/your-org/your-repo.git"; exit 1; fi
	@if [ -z "$(REPO_URL)" ]; then echo "REPO_URL is required. Usage: make bootstrap-vps HOST=your.vps.ip REPO_URL=https://github.com/your-org/your-repo.git"; exit 1; fi
	powershell -ExecutionPolicy Bypass -File infra/scripts/bootstrap-vps.ps1 -HostName "$(HOST)" -RepoUrl "$(REPO_URL)"

deploy:
	powershell -ExecutionPolicy Bypass -File infra/scripts/deploy.ps1

deploy-remote:
	@if [ -z "$(HOST)" ]; then echo "HOST is required. Usage: make deploy-remote HOST=your.vps.ip"; exit 1; fi
	powershell -ExecutionPolicy Bypass -File infra/scripts/deploy-remote.ps1 -HostName "$(HOST)"

post-deploy:
	powershell -ExecutionPolicy Bypass -File infra/scripts/post-deploy.ps1

validate-production-env:
	powershell -ExecutionPolicy Bypass -File infra/scripts/validate-production-env.ps1 -EnvFile "$(ENV_FILE)"

verify-production:
	powershell -ExecutionPolicy Bypass -File infra/scripts/verify-production.ps1
