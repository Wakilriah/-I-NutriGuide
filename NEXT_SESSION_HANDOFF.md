# Next Session Handoff

## Current State

All local backend, admin, mobile, documentation, and deployment-preparation work is complete and verified.

## Latest Saved Work

On 2026-05-13, the old recommendation scoring path was replaced with the new hybrid food recommendation system:

- Added production Django services for content-based filtering, association rules, collaborative filtering, hybrid fusion, normalization, and training.
- Added `python manage.py train_recommender`.
- Added `GET /api/v1/recommendations/foods/?n=10`.
- Added `POST /api/v1/recommendations/preview/`.
- Rewired `POST /api/v1/recommendations/generate/` to use the hybrid engine while preserving recommendation history for the mobile app.
- Updated the recommendation disclaimer to: `Recommendations are nutritional suggestions and do not replace medical advice.`
- Updated README, architecture, backend guide, API contract, feature checklist, and OpenAPI schema.
- Training command produced `/storage/recommender/hybrid_recommender.pkl` with 3 users, 3,207 foods, 23 interactions, and 28 rules in the dev database.

On 2026-05-13, the mobile and admin UI were redesigned toward a professional healthy food and dietary supplement product identity:

- Added mobile design tokens in `apps/mobile-app/src/theme/design.ts`.
- Added reusable mobile UI components in `apps/mobile-app/src/components/ui.tsx`.
- Redesigned mobile welcome, login, register, onboarding, home, supplements, recommendations, recommendation detail, and feedback UI.
- Updated mobile bottom tabs with clearer nutrition/supplement navigation.
- Refreshed admin visual styling in `apps/admin-panel/src/styles.css` with healthy green, soft orange, off-white surfaces, modern cards, and softer shadows.
- Added visual rule meters for support/confidence/lift in admin association rules.
- Added visual score meters in admin recommendation logs.
- Kept backend/API behavior unchanged for the redesign.
- Verification after redesign:
  - Mobile typecheck: passed.
  - Mobile tests: 54 passed.
  - Admin tests: 15 passed.
  - Admin lint: passed.
  - Admin build: passed.
- Mobile tests may print non-failing Expo vector icon `act(...)` warnings; the suites still pass.

On 2026-05-12, the remaining local documentation drift was cleaned up:

- Refreshed `07_DATABASE_SCHEMA.md` and `docs/database-schema.md` against the implemented Django models.
- Refreshed `08_API_CONTRACT.md` and `docs/api-contract.md` against the implemented URL routes.
- Refreshed `02_MONOREPO_ARCHITECTURE.md` and `docs/architecture.md` with current repo layout and deployment scripts.
- Refreshed `03_BACKEND_GUIDE.md` and `docs/backend-guide.md` to remove unimplemented draft model names.
- Refreshed `04_RECOMMENDATION_ENGINE.md` and `docs/recommendation-engine.md` with the current recommendation service files.
- Refreshed `05_ADMIN_PANEL_GUIDE.md` and `docs/admin-guide.md` with the current admin folder structure.
- Refreshed `06_MOBILE_APP_GUIDE.md` and `docs/mobile-guide.md` to reflect NativeWind and the current mobile test count.
- Cleaned `00_README_FOR_CODEX.md` structure blocks.
- Added `ENV_FILE` support to `Makefile` production validation targets.
- Added `infra/scripts/restore-db.ps1` and documented PowerShell restore usage.
- Refreshed README and DevOps docs for current Makefile targets, Dozzle auth env, and backup/restore scripts.
- Converted `12_LOGICAL_BUILD_PLAN.md` and `docs/logical-build-plan.md` from a planned roadmap into the current completed/local-vs-VPS status plan.
- Refreshed `01_PROJECT_OVERVIEW.md`, `10_TESTING_STRATEGY.md`, and their docs mirrors to remove stale planning wording and record current test counts.
- Added working ESLint setup for the admin panel so `npm run lint` and `make lint` no longer point at a missing command.
- Added a mobile npm `overrides.postcss=8.5.14` pin to clear the Expo/Tailwind PostCSS production audit advisory without changing Expo SDK 54.
- Updated Makefile backend test/lint targets to run through Docker Compose instead of requiring host Python/Ruff.
- Tightened ignore files for local logs and Celery beat schedule artifacts.
- Refreshed app-level READMEs for backend Docker workflow, admin lint/build/audit, and completed mobile features/checks.
- Added Makefile guard messages for `restore-db`, `bootstrap-vps`, and `deploy-remote` when required arguments are missing.
- Added CIQUAL CSV integration work: raw file placement, model metadata, import command with bulk food nutrient writes, importer tests, recommendation synergy updates, React admin food source display/filter, Django admin CIQUAL search/filter fields, French CIQUAL dietary restriction filtering, and docs.
- Kept root docs and `docs/` mirrors synced where mirrors exist.

CIQUAL-specific backend verification is complete. Docker Desktop was started, migrations ran, backend tests passed, Ruff passed, OpenAPI schema regenerated, a 100-row sample import passed, the full CIQUAL import completed in the dev database, and baseline seed data was refreshed.

The only remaining unchecked items in `11_FEATURE_CHECKLIST.md` require access to the real VPS and production domains:

- Run migrations on VPS.
- Seed data on VPS.
- Create superuser on VPS.
- Verify API domain.
- Verify admin domain.
- Verify Dozzle domain is protected.
- Verify mobile app reaches API.

Do not mark those complete until they are run against the real deployed server.

## Important Deployment Commands

Validate a filled production env:

```powershell
make validate-production-env
```

Bootstrap a fresh Ubuntu/Debian VPS:

```powershell
make bootstrap-vps HOST=your.vps.ip REPO_URL=https://github.com/your-org/your-repo.git
```

Deploy remotely after the repo exists on the VPS:

```powershell
make deploy-remote HOST=your.vps.ip
```

Verify live domains:

```powershell
make verify-production
```

Check DNS before deploy:

```powershell
$env:VPS_IP="your.vps.ip"
make check-dns
```

## Production Env Requirements

Copy `.env.production.example` to `.env` and replace every placeholder. Critical values:

- `API_DOMAIN`
- `ADMIN_DOMAIN`
- `LOGS_DOMAIN`
- `VITE_API_BASE_URL`
- `EXPO_PUBLIC_API_BASE_URL`
- `TRAEFIK_ACME_EMAIL`
- `ADMIN_EMAIL`
- `ADMIN_NAME`
- `ADMIN_PASSWORD`
- `DOZZLE_BASIC_AUTH`
- `DJANGO_SECRET_KEY`
- database password and Django security settings

`VITE_API_BASE_URL` is used at admin Docker build time, so it must be correct before `docker compose up --build`.

## Verification Already Completed Locally

Refreshed on 2026-05-13:

- Backend full test suite in Docker: 60 passed.
- Backend Django system check: passed.
- Backend production Docker build: passed.
- Backend production `check --deploy`: only optional HSTS preload warning remains.
- Admin tests: 15 passed.
- Admin production build: passed again on 2026-05-13 after redesign.
- Admin lint: passed again on 2026-05-13 after redesign.
- Mobile tests: 54 passed.
- Mobile typecheck: passed again on 2026-05-13 after redesign.
- Hybrid recommender training command: passed.
- Expo dependency check: passed again on 2026-05-12.
- Backend Python compile check for apps/tests: passed after CIQUAL changes.
- Backend Ruff lint: passed after CIQUAL changes.
- OpenAPI schema generation: passed after CIQUAL changes.
- CIQUAL sample import: 100 rows, 0 bad rows.
- CIQUAL full import: 3,186 rows seen, 3,185 CIQUAL foods in the dev database, 0 bad rows.
- Baseline seed_all passed after full CIQUAL import.
- Dev database totals after seeding: 3,207 foods, 3,185 CIQUAL foods, 28 nutrients, 11 supplements, 9 active rules.
- Mobile production dependency audit: 0 vulnerabilities on 2026-05-12.
- Admin production dependency audit: 0 vulnerabilities on 2026-05-12.
- Production Compose config: validates.
- Secret scan: passed.
- PowerShell deployment helper scripts parse successfully.
- Root and docs feature checklists are synced and use plain ASCII headings.
- Database schema, API contract, architecture, and backend guides were refreshed against the implemented code and mirrored under `docs/`.
- Admin, mobile, recommendation, and Codex README guides were refreshed for current folders, NativeWind/test counts, and ASCII-only structure blocks.

## Recent Deployment Tooling Added

- `infra/scripts/bootstrap-vps.ps1`
- `infra/scripts/bootstrap-vps.sh`
- `infra/scripts/deploy-remote.ps1`
- `infra/scripts/deploy-remote.sh`
- `infra/scripts/post-deploy.ps1`
- `infra/scripts/post-deploy.sh`
- `infra/scripts/validate-production-env.ps1`
- `infra/scripts/validate-production-env.sh`
- `infra/scripts/verify-production.ps1`
- `infra/scripts/verify-production.sh`
- `infra/scripts/check-dns.ps1`
- `infra/scripts/check-dns.sh`

## Files Worth Reading First Next Time

- `11_FEATURE_CHECKLIST.md`
- `09_DEVOPS_DEPLOYMENT.md`
- `.env.production.example`
- `docker-compose.prod.yml`
- `infra/scripts/deploy-remote.ps1`
- `infra/scripts/validate-production-env.ps1`
- `infra/scripts/verify-production.ps1`
