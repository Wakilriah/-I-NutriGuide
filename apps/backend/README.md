# I-NutriGuide Backend

Django REST Framework API for I-NutriGuide.

## Local Development

```sh
docker compose -f ../../docker-compose.dev.yml up --build backend postgres redis
```

The root Makefile backend targets run through Docker Compose, so Docker Desktop must be running.

Health check:

```txt
GET /api/v1/health/
```

Core endpoints:

```txt
POST /api/v1/auth/register/
POST /api/v1/auth/login/
POST /api/v1/auth/refresh/
GET  /api/v1/auth/me/
GET  /api/v1/profile/
PUT  /api/v1/profile/
PATCH /api/v1/profile/
GET  /api/v1/foods/
GET  /api/v1/supplements/
POST /api/v1/user-supplements/
POST /api/v1/recommendations/generate/
GET  /api/v1/recommendations/history/
POST /api/v1/feedback/
```

Run tests:

```sh
docker compose -f ../../docker-compose.dev.yml run --rm backend python -m pytest
```

Run lint:

```sh
docker compose -f ../../docker-compose.dev.yml run --rm backend ruff check .
```
