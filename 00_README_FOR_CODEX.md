# I-NutriGuide - Codex Agent Build Guide

## Purpose
Build **I-NutriGuide**, an AI-powered supplement-food recommendation system. The system helps users enter dietary supplements, preferences, restrictions, allergies, and nutrition goals, then returns food recommendations that complement those supplements and explain why they are recommended.

The project must be built as a production-style monorepo with:

- **Backend API:** Django + Django REST Framework + PostgreSQL + Redis + Celery
- **Admin Panel:** React + Vite + TypeScript + Shadcn UI + Tailwind CSS + React Query + Zustand
- **Mobile App:** React Native + Expo + TypeScript + Expo Router + React Query + Zustand
- **Infrastructure:** Docker + Docker Compose + Traefik + Dozzle + VPS deployment
- **Recommendation Engine:** Python logic inside Django using content-based filtering + association rules

## Important Rules for the Agent

1. Work feature-by-feature, not file-by-file randomly.
2. After each feature is completed, add or update tests.
3. Do not mark a checklist task as completed until tests pass.
4. Keep the monorepo clean and consistent.
5. Do not use Redux anywhere.
6. Use React Query for server state and Zustand for local/global UI state.
7. Use Django REST Framework serializers/viewsets where appropriate.
8. Use JWT authentication for API access.
9. Use Docker from the beginning, not only at the end.
10. Add useful README files for setup and development.
11. Add seed data early so the mobile and admin apps can be tested.
12. Every recommendation must include an explanation.
13. Health-related output must include a safe disclaimer and must not claim to cure disease.

## High-Level System

```txt
inutriguide/
|-- apps/
|   |-- backend/          # Django + DRF API
|   |-- admin-panel/      # React + Vite admin dashboard
|   `-- mobile-app/       # React Native + Expo app
|-- packages/
|   |-- shared-types/     # Optional shared TypeScript types
|   `-- config/           # Optional shared configs
|-- infra/
|   |-- traefik/          # Traefik dynamic/static config
|   |-- scripts/          # Deployment and backup scripts
|   `-- docker/           # Extra Docker-related files
|-- docs/
|-- docker-compose.yml
|-- docker-compose.dev.yml
|-- docker-compose.prod.yml
|-- .env.example
`-- README.md
```

## Recommended Development Order

1. Initialize monorepo and Docker baseline.
2. Build backend core models and authentication.
3. Add seed data for foods, nutrients, supplements, and rules.
4. Build recommendation engine and API.
5. Build admin panel CRUD for data management.
6. Build mobile onboarding/profile/supplement flow.
7. Connect mobile app to recommendation endpoint.
8. Add feedback and recommendation history.
9. Add analytics to admin panel.
10. Add production deployment with Traefik and Dozzle.

## Required Documentation Files

The repository should include these markdown docs under `/docs`:

```txt
docs/
|-- project-overview.md
|-- architecture.md
|-- backend-guide.md
|-- admin-guide.md
|-- mobile-guide.md
|-- recommendation-engine.md
|-- database-schema.md
|-- api-contract.md
|-- devops-deployment.md
|-- testing-strategy.md
`-- feature-checklist.md
```

These generated files are the blueprint. Implement the actual project according to them.
