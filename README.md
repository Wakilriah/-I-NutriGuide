# I-NutriGuide

I-NutriGuide is an AI-powered nutrition recommendation system that suggests foods which complement a user's dietary supplements while respecting allergies, restrictions, preferences, and safe educational guidance.

## Monorepo Layout

```txt
apps/
  backend/       Django + DRF API
  admin-panel/   React + Vite admin panel
  mobile-app/    Expo mobile app
packages/
  shared-types/  Shared TypeScript contracts
  config/        Shared project configuration
infra/
  traefik/
  scripts/
docs/
```

## Sprint 1 Development

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Start the local stack:

```sh
make start-local
```

`make start-local` starts Docker Desktop when needed, starts PostgreSQL, Redis, backend, and admin panel, then waits for the backend health endpoint. Use this when the browser shows `ERR_CONNECTION_REFUSED` for `localhost:8000`.

To include the Expo app in the Docker dev stack, run:

```sh
powershell -ExecutionPolicy Bypass -File infra/scripts/start-local-dev.ps1 -WithMobile
```

For full foreground logs/build output, use:

```sh
make dev
```

The initial services are prepared for:

- Backend API: http://localhost:8000
- Health endpoint: http://localhost:8000/api/v1/health/
- Admin panel: http://localhost:5173
- Expo app: http://localhost:8081
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Celery worker and beat run in the dev Compose stack
- Dozzle: http://localhost:9999

When using Expo Go from a physical phone, set `REACT_NATIVE_PACKAGER_HOSTNAME` and `EXPO_PUBLIC_API_BASE_URL` in `.env` to your computer's LAN IP so the QR code and API calls point at the host machine instead of the Docker container IP.

## Local Admin Credentials

Use this local development admin account for the Django API and admin panel:

```txt
Email: riahwakil@gmail.com
Password: NutriGuide!2026-Riah
```

## Local Commands

```sh
make test-backend
make test-admin
make test-mobile
make lint
make migrate
make seed
make seed-demo
make prod-config
make check-traefik-routes
make check-secrets
make backup-db
make restore-db BACKUP=backups/inutriguide-YYYYMMDD-HHMMSS.sql
```

`make seed-demo` creates a local demo user and a recommendation/feedback record:

```txt
Email: demo.user@inutriguide.local
Password: DemoUser!2026
```

For production, copy `.env.production.example` to `.env`, fill the real domains and secrets, then run `make deploy`.
`make prod-config` validates the production Compose file against `.env.production.example`; use `make prod-config ENV_FILE=.env` when validating a filled production env.
`make validate-production-env ENV_FILE=.env` checks that required production values are filled and not placeholders.
`make check-traefik-routes` runs the production Traefik routing shape locally on port `18080` with `api.localhost`, `admin.localhost`, and `logs.localhost` host headers.
`make check-secrets` scans the repository for committed production secrets; local demo credentials and placeholder values are intentionally allowlisted.
Backend test/lint Makefile targets run inside the Docker backend service, so Docker Desktop must be running for those targets.
The backend dev server runs with Django autoreload disabled inside Docker to avoid Windows bind-mount file watcher crashes.

## CIQUAL Food Database Import

The French CIQUAL food composition CSV is stored at:

```txt
apps/backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv
```

Import a sample:

```sh
docker compose -f docker-compose.dev.yml exec backend python manage.py import_ciqual_foods backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv --limit 100
```

Import the full file:

```sh
docker compose -f docker-compose.dev.yml exec backend python manage.py import_ciqual_foods backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv
```

CIQUAL provides the food nutrient database. Association rules still provide the supplement-food synergy layer used by recommendations.

## Hybrid Food Recommender

The active recommendation engine is the Django hybrid recommender:

- CBF safety/relevance scoring for goals, medical profile, supplements, calories, allergies, and excluded foods.
- Association-rule scoring from database rules and trained user/profile/food transactions.
- User-based collaborative scoring from real recommendation and feedback interactions. It does not use random food matrices.
- Nutrient interaction scoring, warning generation, confidence scoring, and educational explanations for every returned food.

Train or refresh the recommender artifacts after importing foods, seeding rules, or collecting new feedback:

```sh
docker compose -f docker-compose.dev.yml exec backend python manage.py train_recommender
```

Call the current user's food recommendations:

```sh
GET /api/v1/recommendations/foods/?n=10
```

Preview recommendations from a temporary profile without saving it:

```sh
POST /api/v1/recommendations/preview/
{
  "supplements": ["vitamin_c", "iron"],
  "goals": ["energy"],
  "maladies": ["anemia"],
  "allergies": ["peanut"],
  "n": 10
}
```

The existing mobile-compatible endpoint `POST /api/v1/recommendations/generate/` now stores history using the same hybrid engine.

Seed the nutrient interaction knowledge graph used by explanations and warnings:

```sh
docker compose -f docker-compose.dev.yml exec backend python manage.py seed_interactions
```

Explainable recommendation responses include `confidence_score`, `confidence_label`, `score_breakdown`, `explanation`, `warnings`, and `feedback.available_actions`. Allergy conflicts remove foods completely; caution and warning messages stay educational and do not replace medical advice.

The project is being built sprint by sprint according to `docs/logical-build-plan.md`. Checklist status is tracked in `docs/feature-checklist.md`.
