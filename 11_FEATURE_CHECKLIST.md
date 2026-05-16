# Feature Task Checklist

The Codex agent must update this checklist during development. Only mark a task complete after implementation and tests pass.

Legend:

- [ ] Not started
- [x] Completed and tested

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
- [x] Add recommendation API endpoint.
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

---

# Phase 10 - Professional UI Redesign

## Mobile Health App Redesign

- [x] Add global mobile design tokens.
- [x] Add reusable Button, Card, Input, Badge, EmptyState, LoadingState, FoodCard, SupplementCard, and RecommendationCard components.
- [x] Redesign welcome screen with I-NutriGuide nutrition identity.
- [x] Redesign login/register screens.
- [x] Redesign profile onboarding, allergies/restrictions, and goals flow with progress indicator.
- [x] Redesign home dashboard with greeting, summary, supplements, recommended foods, and quick actions.
- [x] Redesign supplements list and add/edit supplement screens.
- [x] Redesign recommendations history and detail screens.
- [x] Keep auth, profile, supplements, recommendations, and feedback API flows working.
- [x] Confirm mobile typecheck passes.
- [x] Confirm mobile tests pass.

## Admin Wellness Dashboard Redesign

- [x] Refresh admin visual identity with healthy green, soft orange, off-white surfaces, modern cards, and softer shadows.
- [x] Redesign admin shell/sidebar and login styling.
- [x] Refresh dashboard metric cards and data panels.
- [x] Refresh food management with CIQUAL source/search/filter styling.
- [x] Refresh supplement management table/form styling.
- [x] Add visual support/confidence/lift meters for association rules.
- [x] Add visual score meters for recommendation logs.
- [x] Keep existing admin API calls and CRUD flows working.
- [x] Confirm admin tests pass.
- [x] Confirm admin lint passes.
- [x] Confirm admin build passes.

---

# Phase 11 - Image-Inspired Healthy Nutrition Theme

## Mobile and Admin Wellness Refresh

- [x] Apply healthy bowl-inspired green, mint, cream, orange, tomato, and natural food styling tokens.
- [x] Add reusable mobile SearchInput, FilterChip, and SectionHeader components.
- [x] Refresh mobile onboarding, home, recommendations, supplement detail, and profile screens with food imagery, cards, chips, badges, and synergy copy.
- [x] Refresh admin CSS variables, panel/card radius, soft shadows, navigation, dashboard language, tables, forms, and metric styling.
- [x] Keep existing mobile and admin behavior compatible with tests.
- [x] Confirm mobile typecheck passes.
- [x] Confirm mobile tests pass.
- [x] Confirm admin tests pass.
- [x] Confirm admin lint passes.
- [x] Confirm admin build passes.

---

# Phase 12 - Full UI/UX and Feature-System Upgrade

## Step 1 - Architecture and Checklist

- [x] Inspect mobile app pages, reusable components, route guards, and theme files.
- [x] Inspect admin app pages, layout, tables, forms, dashboard, and central CSS.
- [x] Identify remaining duplicated UI logic and hardcoded visual values.
- [x] Create implementation plan for the next pass.

## Step 2 - Design System and Components

- [x] Expand mobile design tokens for gradients, overlays, icon sizes, typography, and reusable card styles.
- [x] Add reusable mobile StatCard, NutrientCard, GoalSelector, and AllergySelector components.
- [x] Remove remaining hardcoded mobile colors from route guards, auth links, and shared controls.

## Step 3 - Mobile Feature UI

- [x] Apply reusable selectors/cards to onboarding, home, recommendation, supplement detail, and profile screens.
- [x] Add daily plan, why-this-food, avoid/separate, match-score, and educational-card UI surfaces without breaking existing API flows.
- [x] Preserve current tests and route behavior.

## Step 4 - Admin Theme and UX Polish

- [x] Tighten admin CSS token usage and reduce remaining hardcoded visual values.
- [x] Improve dashboard/stat/table/form wellness styling without breaking CRUD flows.

## Step 5 - Verification

- [x] Confirm mobile typecheck passes.
- [x] Confirm mobile tests pass.
- [x] Confirm admin tests pass.
- [x] Confirm admin lint passes.
- [x] Confirm admin build passes.

---

# Phase 13 - Feedback and Analytics UX Layer

## Mobile Recommendation Actions

- [x] Add reusable recommendation action controls for like, save, avoid, and dislike UI states.
- [x] Surface feedback-learning controls on recommendation detail cards without changing backend contracts.
- [x] Add premium feature preview cards for meal plans, AI assistant, PDF reports, and advanced analytics.

## Admin Analytics Polish

- [x] Add recommendation quality summary cards for total items, average match score, nutrient synergy, and rule score.
- [x] Add top-pairing insight surface from existing recommendation data.

## Verification

- [x] Confirm mobile typecheck passes.
- [x] Confirm mobile tests pass.
- [x] Confirm admin tests pass.
- [x] Confirm admin lint passes.
- [x] Confirm admin build passes.

---

# Phase 14 - Recommendation Feedback Persistence

## Mobile Quick Actions

- [x] Connect like and dislike quick actions to the existing recommendation feedback API.
- [x] Connect avoid quick action to profile disliked-food preferences.
- [x] Keep save action as local UI state until a saved-foods endpoint exists.
- [x] Confirm mobile typecheck passes.
- [x] Confirm mobile tests pass.

---

# Phase 15 - Saved Recommendation Persistence

## Backend Saved Foods API

- [x] Add saved recommendation item model and migration.
- [x] Add user-scoped saved foods list/create/delete API endpoints.
- [x] Add backend tests for save, duplicate save, unsave, and ownership validation.

## Mobile Save Action

- [x] Connect recommendation save quick action to the saved foods API.
- [x] Confirm backend tests pass.
- [x] Confirm mobile typecheck passes.
- [x] Confirm mobile tests pass.

---

# Phase 16 - Mobile Saved Foods Screen

## Saved Foods UX

- [x] Add Saved tab to the mobile app navigation.
- [x] Add saved-foods screen using the persisted saved recommendation API.
- [x] Add open and remove actions for saved recommendation items.
- [x] Include run id in recommendation item API payloads so saved items can open their source recommendation.
- [x] Add mobile route tests for empty, populated, open, and remove states.
- [x] Confirm backend recommendation tests pass.
- [x] Confirm mobile typecheck passes.
- [x] Confirm mobile tests pass.
- [x] Apply saved recommendation migration to the running local Docker backend.

---

# Phase 17 - Saved Foods Admin Analytics

## Admin Saved Food Signals

- [x] Add saved-food count and most-saved-foods data to the admin dashboard analytics API.
- [x] Surface saved-food metrics and most-saved-food list on the admin dashboard.
- [x] Add backend analytics assertions for saved-food dashboard data.
- [x] Add admin dashboard test coverage for saved-food metrics.
- [x] Confirm backend analytics tests pass.
- [x] Confirm admin tests pass.
- [x] Confirm admin lint passes.
- [x] Confirm admin build passes.

---

# Phase 18 - Admin Access Token Refresh

## Admin API Client

- [x] Extend the shared admin Axios client with request and response interceptors.
- [x] Check access token expiry before protected requests and refresh with `/auth/refresh/` when needed.
- [x] Store refreshed access tokens in the admin auth store.
- [x] Retry one failed 401 request after a successful refresh.
- [x] Log out when refresh fails or no refresh token is available.
- [x] Preserve explicit authorization headers for login/current-user requests.
- [x] Treat unreadable persisted access tokens as invalid and refresh before sending protected admin requests.
- [x] Refresh and retry when SimpleJWT returns `token_not_valid`.
- [x] Confirm admin tests pass.
- [x] Confirm admin lint passes.
- [x] Confirm admin build passes.

---

# Phase 19 - Auth Form Validation Structure

## Mobile Auth Forms

- [x] Move mobile login and register validation into `src/features/auth/schemas.ts`.
- [x] Keep React Hook Form with controlled React Native inputs.
- [x] Add password confirmation validation to mobile registration.
- [x] Add show/hide password controls to mobile login and registration.
- [x] Add mobile tests for password confirmation and visibility toggles.

## Admin Auth Forms

- [x] Move admin login validation into `src/features/auth/schemas.ts`.
- [x] Keep React Hook Form and Zod validation for admin login.
- [x] Add show/hide password control to admin login.
- [x] Add admin test coverage for password visibility.

## Verification

- [x] Confirm mobile typecheck passes.
- [x] Confirm mobile tests pass.
- [x] Confirm admin tests pass.
- [x] Confirm admin lint passes.
- [x] Confirm admin build passes.

---

# Phase 20 - Login Blur Validation

## Mobile Login

- [x] Validate email and password when each login input loses focus.
- [x] Pass React Hook Form blur handlers through controlled React Native inputs.
- [x] Add mobile login test coverage for blur validation.

## Admin Login

- [x] Validate email and password when each admin login input loses focus.
- [x] Keep React Hook Form blur validation active through registered web inputs.
- [x] Add admin login test coverage for blur validation.

## Verification

- [x] Confirm mobile typecheck passes.
- [x] Confirm targeted mobile login tests pass.
- [x] Confirm admin tests pass.
- [x] Confirm admin lint passes.
- [x] Confirm admin build passes.

---

# Phase 21 - Friendly Login Failure Messages

## Mobile Login

- [x] Hide backend credential failure details from the login UI.
- [x] Show `Please verify your email and password and try again.` for failed login credentials.
- [x] Preserve the existing network error message when the API cannot be reached.
- [x] Add mobile login test coverage for hidden raw backend errors.

## Admin Login

- [x] Hide backend credential failure details from the admin login UI.
- [x] Show `Please verify your email and password and try again.` for failed admin login credentials.
- [x] Add admin login test coverage for hidden raw backend errors.

## Verification

- [x] Confirm targeted mobile login tests pass.
- [x] Confirm mobile typecheck passes.
- [x] Confirm admin tests pass.
- [x] Confirm admin lint passes.
- [x] Confirm admin build passes.
