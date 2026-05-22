# Feature Task Checklist

The Codex agent must update this checklist during development. Only mark a task complete after implementation and tests pass.

Legend:

- [ ] Not started
- [x] Completed and tested

---

# Explainable Recommendation Upgrade

- [x] Add `NutrientInteraction` model, migration, admin registration, seed command, list endpoint, and graph endpoint.
- [x] Add explanation engine with educational recommendation reasons.
- [x] Add smart warnings engine for allergies, disliked foods, inhibitory interactions, and cautions.
- [x] Add normalized confidence score and score breakdown fields to recommendation items.
- [x] Extend recommendation feedback types and connect feedback to future scoring/blocking.
- [x] Update mobile recommendation cards with confidence, explanations, warnings, score breakdown, and feedback buttons.
- [x] Add admin interaction table and recommendation inspector details.
- [x] Add backend and mobile tests for explainable recommendation behavior.
- [x] Update API and recommendation documentation.

---

# Phase 0 - Repository and Planning

## Monorepo Setup

- [x] Create root monorepo structure.
- [x] Add root README with setup instructions.
- [x] Add `.env.example`.
- [x] Add `.gitignore`.
- [x] Add docs folder.
- [x] Add Makefile or root scripts for common commands.
- [x] Add Docker Compose development file.
- [x] Verify empty services can be built or prepared.

## Architecture Documentation

- [x] Add architecture document.
- [x] Add API contract document.
- [x] Add database schema document.
- [x] Add testing strategy document.
- [x] Add deployment document.

---

# Phase 1 - Backend Foundation

## Django Project Setup

- [x] Create Django project under `apps/backend`.
- [x] Configure settings split: base/dev/test/prod.
- [x] Install Django REST Framework.
- [x] Configure PostgreSQL.
- [x] Configure Redis.
- [x] Configure CORS.
- [x] Configure Simple JWT.
- [x] Configure drf-spectacular API schema.
- [x] Add health endpoint.
- [x] Add backend Dockerfile.
- [x] Add backend tests baseline.
- [x] Confirm backend starts in Docker.
- [x] Confirm backend tests pass.

## Accounts and Auth

- [x] Implement registration endpoint.
- [x] Implement login endpoint.
- [x] Implement refresh token endpoint.
- [x] Implement current user endpoint.
- [x] Implement user profile model.
- [x] Implement profile read/update endpoint.
- [x] Implement allergies/restrictions/disliked foods.
- [x] Add auth tests.
- [x] Add profile tests.
- [x] Confirm all auth/profile tests pass.

---

# Phase 2 - Knowledge Base Backend

## Nutrients

- [x] Create Nutrient model.
- [x] Create Nutrient serializer.
- [x] Create Nutrient admin CRUD API.
- [x] Add permissions.
- [x] Add tests.
- [x] Add seed command for nutrients.
- [x] Confirm tests pass.

## Foods

- [x] Create FoodCategory model.
- [x] Create Food model.
- [x] Create FoodNutrient model.
- [x] Create serializers.
- [x] Create admin CRUD API.
- [x] Create public read API.
- [x] Add search/filter support.
- [x] Add tests.
- [x] Add seed command for foods.
- [x] Confirm tests pass.

## Supplements

- [x] Create Supplement model.
- [x] Create SupplementNutrient model.
- [x] Create UserSupplement model.
- [x] Create serializers.
- [x] Create admin CRUD API.
- [x] Create user supplement API.
- [x] Add tests.
- [x] Add seed command for supplements.
- [x] Confirm tests pass.

## Association Rules

- [x] Create AssociationRule model.
- [x] Create serializer.
- [x] Create admin CRUD API.
- [x] Add enable/disable behavior.
- [x] Add tests.
- [x] Add seed command for rules.
- [x] Confirm tests pass.

---

# Phase 3 - Recommendation Engine Backend

## Recommendation Core

- [x] Create RecommendationRun model.
- [x] Create RecommendationItem model.
- [x] Create recommendation service folder.
- [x] Implement hybrid recommender services: CBF, association rules, collaborative filtering, fusion, normalizer, and training.
- [x] Implement candidate food filtering.
- [x] Implement allergy filtering.
- [x] Implement diet restriction filtering.
- [x] Implement nutrient compatibility scoring.
- [x] Implement association rule scoring.
- [x] Implement preference scoring.
- [x] Implement final ranking.
- [x] Implement explanation generation.
- [x] Include health disclaimer.
- [x] Save recommendation run and items.
- [x] Add recommendation API endpoints for foods, preview, generate, and history.
- [x] Add train_recommender management command.
- [x] Add recommendation history endpoint.
- [x] Add tests for all recommendation rules.
- [x] Confirm tests pass.

## Caching and Celery

- [x] Configure Redis cache.
- [x] Add recommendation cache key generator.
- [x] Cache repeated recommendation responses.
- [x] Invalidate cache on profile/supplement changes.
- [x] Configure Celery.
- [x] Add Celery worker service.
- [x] Add sample background task.
- [x] Add tests or smoke test for cache behavior.
- [x] Confirm tests pass.

## Feedback and Analytics

- [x] Create RecommendationFeedback model.
- [x] Create feedback endpoint.
- [x] Add feedback permissions.
- [x] Add admin feedback list endpoint.
- [x] Add dashboard analytics endpoint.
- [x] Add recommendation analytics endpoint.
- [x] Add tests.
- [x] Confirm tests pass.

---

# Phase 4 - Admin Panel Foundation

## Admin Setup

- [x] Create Vite React TypeScript app.
- [x] Install Tailwind CSS.
- [x] Install Shadcn UI.
- [x] Install React Query.
- [x] Install Zustand.
- [x] Install Axios.
- [x] Install React Hook Form and Zod.
- [x] Create app router.
- [x] Create layout components.
- [x] Create API client.
- [x] Create auth store.
- [x] Add admin Dockerfile.
- [x] Add admin test baseline.
- [x] Confirm admin starts.
- [x] Confirm admin tests pass.

## Admin Auth

- [x] Build login page.
- [x] Implement token storage.
- [x] Implement protected routes.
- [x] Implement logout.
- [x] Add auth tests.
- [x] Confirm tests pass.

## Admin Dashboard

- [x] Build dashboard page.
- [x] Add metric cards.
- [x] Add charts or simple tables.
- [x] Add loading/error/empty states.
- [x] Add tests.
- [x] Confirm tests pass.

---

# Phase 5 - Admin Knowledge Base Features

## Admin Nutrients

- [x] Build nutrients list.
- [x] Build create nutrient form.
- [x] Build edit nutrient form.
- [x] Add delete/deactivate action.
- [x] Add tests.
- [x] Confirm tests pass.

## Admin Foods

- [x] Build foods list.
- [x] Add search/filter.
- [x] Build create food form.
- [x] Build edit food form.
- [x] Add food nutrient management.
- [x] Add deactivate action.
- [x] Add tests.
- [x] Confirm tests pass.

## Admin Supplements

- [x] Build supplements list.
- [x] Build create supplement form.
- [x] Build edit supplement form.
- [x] Add supplement nutrient management.
- [x] Add deactivate action.
- [x] Add tests.
- [x] Confirm tests pass.

## Admin Association Rules

- [x] Build rules list.
- [x] Build create rule form.
- [x] Build edit rule form.
- [x] Add support/confidence/lift validation.
- [x] Add enable/disable action.
- [x] Add tests.
- [x] Confirm tests pass.

## Admin Users, Recommendations, Feedback

- [x] Build users list.
- [x] Build user detail page.
- [x] Build recommendation logs page.
- [x] Build recommendation run detail page.
- [x] Build feedback list page.
- [x] Add filters.
- [x] Add tests.
- [x] Confirm tests pass.

---

# Phase 6 - Mobile App Foundation

## Expo Setup

- [x] Create Expo app with TypeScript.
- [x] Configure Expo Router.
- [x] Install React Query.
- [x] Install Zustand.
- [x] Install Axios.
- [x] Install SecureStore.
- [x] Install React Hook Form and Zod.
- [x] Configure styling library.
- [x] Create API client.
- [x] Create auth store.
- [x] Create app navigation layout.
- [x] Add mobile test baseline.
- [x] Confirm mobile app starts.
- [x] Confirm mobile tests pass.

## Mobile Auth

- [x] Build welcome screen.
- [x] Build login screen.
- [x] Build register screen.
- [x] Store tokens securely.
- [x] Implement logout.
- [x] Add auth tests.
- [x] Confirm tests pass.

---

# Phase 7 - Mobile User Features

## Onboarding and Profile

- [x] Build profile onboarding screen.
- [x] Build allergies screen.
- [x] Build goals/preferences screen.
- [x] Connect to profile API.
- [x] Add validation.
- [x] Add tests.
- [x] Confirm tests pass.

## Supplements

- [x] Build user supplements screen.
- [x] Build add supplement screen.
- [x] Build edit supplement flow.
- [x] Connect to supplements API.
- [x] Add loading/error/empty states.
- [x] Add tests.
- [x] Confirm tests pass.

## Recommendations

- [x] Build generate recommendation button/flow.
- [x] Build recommendations list.
- [x] Build recommendation card.
- [x] Build recommendation detail screen.
- [x] Show explanation.
- [x] Show disclaimer.
- [x] Show warnings/tags.
- [x] Add feedback form.
- [x] Add tests.
- [x] Confirm tests pass.

---

# Phase 8 - DevOps and Deployment

## Docker Compose

- [x] Add PostgreSQL service.
- [x] Add Redis service.
- [x] Add backend service.
- [x] Add Celery worker service.
- [x] Add Celery beat service.
- [x] Add admin panel service.
- [x] Add Traefik service.
- [x] Add Dozzle service.
- [x] Add persistent volumes.
- [x] Add health checks.
- [x] Confirm full stack starts locally.

## Traefik

- [x] Configure API route.
- [x] Configure admin route.
- [x] Configure Dozzle route.
- [x] Add HTTPS configuration for production.
- [x] Add Basic Auth for Dozzle.
- [x] Add HTTP to HTTPS redirect.
- [x] Confirm routes work.

## VPS Deployment

- [x] Write deployment guide.
- [x] Add deploy script.
- [x] Add database backup script.
- [x] Configure production env example.
- [x] Test production compose build.
- [ ] Run migrations on VPS.
- [ ] Seed data on VPS.
- [ ] Create superuser.
- [ ] Verify API domain.
- [ ] Verify admin domain.
- [ ] Verify Dozzle domain is protected.
- [ ] Verify mobile app reaches API.

---

# Phase 9 - Final Integration and Demo

## End-to-End Demo Flow

- [x] Admin logs in.
- [x] Admin creates nutrient.
- [x] Admin creates food.
- [x] Admin creates supplement.
- [x] Admin creates association rule.
- [x] Mobile user registers.
- [x] Mobile user completes profile.
- [x] Mobile user adds supplement.
- [x] Mobile user generates recommendations.
- [x] Mobile user reads explanation.
- [x] Mobile user submits feedback.
- [x] Admin views feedback and analytics.
- [x] Dozzle shows logs.

## Final Quality Checks

- [x] Backend tests pass.
- [x] Admin tests pass.
- [x] Mobile tests pass.
- [x] Docker stack starts from clean state.
- [x] API schema is generated.
- [x] README setup instructions are correct.
- [x] Health endpoint passes.
- [x] No secrets committed.
- [x] Demo seed data is realistic.
- [x] Recommendation explanations are safe and understandable.
