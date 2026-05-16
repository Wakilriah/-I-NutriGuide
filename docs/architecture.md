# Monorepo Architecture

## Repository Layout

```txt
inutriguide/
  apps/
    backend/
      config/
      apps/
        accounts/
        foods/
        supplements/
        nutrients/
        rules/
        recommendations/
        feedback/
        analytics/
      requirements/
      tests/
      manage.py
      Dockerfile
    admin-panel/
      src/
        app/
        components/
        features/
        lib/
        stores/
        types/
        main.tsx
      Dockerfile
    mobile-app/
      app/
      src/
        components/
        features/
        lib/
        stores/
        types/
      app.json
  packages/
    shared-types/
    config/
  infra/
    traefik/
    scripts/
      backup-db.ps1
      backup-db.sh
      bootstrap-vps.ps1
      bootstrap-vps.sh
      check-dns.ps1
      check-dns.sh
      check-secrets.ps1
      check-traefik-routes.ps1
      deploy-remote.ps1
      deploy-remote.sh
      deploy.ps1
      deploy.sh
      post-deploy.ps1
      post-deploy.sh
      restore-db.sh
      smoke-stack.ps1
      validate-production-env.ps1
      validate-production-env.sh
      verify-production.ps1
      verify-production.sh
  docs/
  docker-compose.yml
  docker-compose.dev.yml
  docker-compose.prod.yml
  .env.example
  .env.production.example
  .gitignore
  README.md
```

## Logical Architecture

```txt
Mobile App             Admin Panel
React Native + Expo    React + Vite
        |                    |
        +------ HTTPS -------+
                 |
              Traefik
                 |
          Django REST API
                 |
          +------+------+
          |             |
      PostgreSQL      Redis
                        |
                  Celery Worker
```

## Service Boundaries

### Backend

Responsible for:

- Authentication
- Authorization
- Business logic
- Data persistence
- Recommendation generation
- Admin APIs
- Mobile APIs
- Caching
- Background jobs

Recommendation generation uses the hybrid recommender in `apps/backend/apps/recommendations/services/`.
The active scoring path combines content-based filtering, association rules, and collaborative filtering:

- CBF filters unsafe foods first, including allergies and excluded foods, then scores goal, medical, supplement, and calorie compatibility.
- Association rules score supplement/profile-food relationships using confidence and lift.
- Collaborative filtering reads real recommendation and feedback interactions; it does not use a random matrix.
- Hybrid fusion adapts weights for cold-start, medical-profile, active, and intermediate users.

Training artifacts are stored under `RECOMMENDER_ARTIFACT_DIR`, defaulting to `apps/backend/storage/recommender`.

### Admin Panel

Responsible for:

- Managing knowledge base
- Managing users
- Monitoring feedback
- Viewing analytics
- Admin-only CRUD workflows

### Mobile App

Responsible for:

- User onboarding
- User profile
- Supplement intake
- Recommendation consumption
- Feedback

## API Design Style

Use versioned API endpoints:

```txt
/api/v1/auth/
/api/v1/profile/
/api/v1/foods/
/api/v1/food-categories/
/api/v1/supplements/
/api/v1/user-supplements/
/api/v1/recommendations/
/api/v1/feedback/
/api/v1/admin/
```

## State Management Decision

Use:

- React Query for remote/server state.
- Zustand for client UI state and authenticated session helpers.

Do not use Redux.

## Environment Strategy

Use `.env.example` for local development defaults and `.env.production.example` for production deployment values.

Local env examples:

```env
POSTGRES_DB=inutriguide
POSTGRES_USER=inutriguide
POSTGRES_PASSWORD=change_me
DATABASE_URL=postgres://inutriguide:change_me@postgres:5432/inutriguide
REDIS_URL=redis://redis:6379/0
DJANGO_SECRET_KEY=change_me
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,api.localhost
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=30
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
API_BASE_URL=http://localhost:8000/api/v1
DOZZLE_AUTH_PROVIDER=simple
```

## Development Ports

```txt
Backend API:       http://localhost:8000
Admin Panel:       http://localhost:5173
PostgreSQL:        localhost:5432
Redis:             localhost:6379
Dozzle:            http://logs.localhost or http://localhost:9999
Traefik Dashboard: http://traefik.localhost
```
