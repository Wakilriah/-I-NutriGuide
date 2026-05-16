# I-NutriGuide Project Handoff for ChatGPT

Use this document when continuing the project in a new ChatGPT/Codex session.

## Project Summary

I-NutriGuide is a full-stack nutrition recommendation system. It recommends foods that complement a user's dietary supplements while respecting allergies, dietary restrictions, disliked foods, and basic nutrition goals.

The system has three main parts:

1. Backend API: Django + Django REST Framework.
2. Admin panel: React + Vite + TypeScript.
3. Mobile app: Expo React Native.

The project also includes Docker Compose, Traefik production routing, Dozzle logs, PostgreSQL, Redis, Celery, deployment scripts, docs, tests, and seed data.

## Current Status

All local implementation work is complete and verified as much as possible on this machine.

The only remaining work requires real VPS/domain access:

- Run migrations on VPS.
- Seed data on VPS.
- Create production superuser.
- Verify API domain.
- Verify admin domain.
- Verify Dozzle domain is protected.
- Verify mobile app reaches deployed API.

Do not mark those VPS/domain tasks complete until they are run against the real deployed server.

## Important Folder

Project folder:

```txt
c:\Users\hp\Desktop\inutriguide_codex_docs
```

Important handoff/status files:

```txt
NEXT_SESSION_HANDOFF.md
11_FEATURE_CHECKLIST.md
12_LOGICAL_BUILD_PLAN.md
09_DEVOPS_DEPLOYMENT.md
.env.production.example
```

## What Was Built

### Backend

Implemented:

- Custom email-based user model.
- Register, login, refresh token, and current-user endpoints.
- User profile endpoint.
- Allergies, dietary restrictions, and disliked foods.
- Nutrients CRUD.
- Foods and food categories CRUD/read API.
- Supplements CRUD/read API.
- User supplement API.
- Association rule API.
- Recommendation engine.
- Recommendation history and detail endpoints.
- Feedback endpoint.
- Admin analytics/dashboard endpoints.
- Health endpoint.
- OpenAPI schema support with drf-spectacular.
- Redis caching.
- Celery worker/beat services.
- Seed commands.
- Production superuser command.

Recommendation behavior is now handled by the hybrid recommender. It includes:

- Content-based filtering for goals, medical profile, supplements, calorie fit, allergies, and excluded foods.
- Association-rule scoring with confidence and lift.
- Collaborative filtering from real recommendation and feedback interactions, not random matrices.
- Adaptive fusion weights for cold-start, medical-profile, active, and intermediate users.
- Allergy filtering.
- Diet restriction filtering.
- Disliked food filtering.
- Disabled food/rule handling.
- Explanation generation and sub-scores.
- Medical-safety disclaimer.
- Cache invalidation on relevant profile/supplement/feedback changes.
- Training artifacts from `python manage.py train_recommender`.

### Admin Panel

Implemented:

- Login.
- Protected admin session.
- Dashboard metrics.
- Knowledge base management.
- Nutrient CRUD.
- Food CRUD.
- Supplement CRUD.
- Association rule CRUD.
- User list/detail.
- Recommendation logs.
- Feedback list.
- Loading/error/empty states.
- Tailwind/shadcn-style UI setup.
- Working ESLint setup.
- Production build with `VITE_API_BASE_URL`.

### Mobile App

Implemented:

- Expo SDK 54 setup.
- Expo Router navigation.
- Welcome screen.
- Login/register.
- Secure token persistence with Expo SecureStore.
- Access token refresh flow.
- Profile onboarding.
- Allergies/restrictions screen.
- Goals/preferences/disliked foods screen.
- Home tab.
- Supplements tab.
- Add/edit/delete user supplement flow.
- Recommendation generation.
- Recommendation history.
- Recommendation detail.
- Explanation/disclaimer/warnings/tags.
- Feedback form.
- NativeWind configuration.
- LAN IP API configuration for physical Android devices.

### DevOps

Implemented:

- Docker Compose development stack.
- Docker Compose production stack.
- Backend Dockerfile.
- Admin Dockerfile.
- Traefik routing.
- HTTPS/ACME configuration.
- Dozzle protected by Basic Auth.
- PostgreSQL and Redis services.
- Celery worker and beat services.
- Backup and restore scripts.
- VPS bootstrap scripts.
- Remote deploy scripts.
- Post-deploy scripts.
- Production env validation scripts.
- DNS check scripts.
- Production verification scripts.
- Secret scan script.
- Makefile targets.

## Recent Changes Made

Recent cleanup and hardening included:

- Refreshed database schema docs against actual Django models.
- Refreshed API contract docs against implemented URL routes.
- Refreshed architecture, backend, admin, mobile, recommendation, testing, deployment, and project overview docs.
- Synced root docs with `docs/` mirrors.
- Converted logical build plan into a current status plan.
- Added `NEXT_SESSION_HANDOFF.md`.
- Added this `CHATGPT_PROJECT_HANDOFF.md`.
- Added working admin ESLint setup.
- Fixed admin lint command.
- Added mobile `overrides.postcss=8.5.14` to clear a production audit advisory without changing Expo SDK 54.
- Added PowerShell database restore script.
- Added `ENV_FILE` support to production Makefile targets.
- Updated Makefile backend test/lint to run through Docker Compose.
- Added guard messages for Makefile targets that require `HOST`, `REPO_URL`, or `BACKUP`.
- Tightened `.gitignore` and `.dockerignore` files for logs and Celery beat schedule artifacts.
- Updated app-level READMEs.
- Added CIQUAL food database integration:
  - Raw CSV stored at `apps/backend/seed_data/raw/Table_Ciqual_2020_FR_20250223.csv`.
  - New `import_ciqual_foods` management command with bulk food nutrient writes.
  - Food/category/nutrient metadata fields for CIQUAL source/code/columns.
  - Tests for CSV parsing, decimal comma conversion, idempotent import, nutrient values, and recommendation usage.
  - Admin food table now shows CIQUAL source/code and can filter by source.
  - Django admin can search/filter CIQUAL foods and categories without loading huge inline lists.
  - Recommendation filtering understands common French CIQUAL meat/fish/dairy/egg category terms for vegan, vegetarian, and lactose-free users.
  - Recommendation rules/scoring now include more CIQUAL-friendly nutrient synergies.
- Added professional UI redesign for the health food and dietary supplement product demo:
  - Mobile design tokens in `apps/mobile-app/src/theme/design.ts`.
  - Mobile reusable UI components in `apps/mobile-app/src/components/ui.tsx`.
  - Redesigned mobile welcome, auth, onboarding, home, supplements, recommendations, detail, and feedback screens.
  - Refreshed admin styling with healthy green, soft orange, off-white surfaces, modern cards, and softer shadows.
  - Added visual support/confidence/lift meters for rules and score meters for recommendation logs.
  - Kept backend/API logic unchanged.
- Replaced the old recommendation scoring path with the new hybrid recommender:
  - Added CBF, association, collaborative, hybrid, normalizer, and training services.
  - Added `GET /api/v1/recommendations/foods/?n=10`.
  - Added `POST /api/v1/recommendations/preview/`.
  - Kept `POST /api/v1/recommendations/generate/` compatible with the mobile app while using the hybrid engine.
  - Updated docs and OpenAPI schema.
  - Trained dev artifacts at `/storage/recommender/hybrid_recommender.pkl`.

## Verification Already Done

Verified locally:

```txt
Backend tests: 60 passed
Admin tests: 15 passed
Mobile tests: 54 passed
Admin lint: passed
Admin production build: passed
Mobile typecheck: passed after redesign
Hybrid recommender training command: passed
Expo dependency check: passed
Backend Python compile check: passed after CIQUAL changes
Backend Ruff lint: passed after CIQUAL changes
OpenAPI schema generation: passed after CIQUAL changes
CIQUAL sample import: 100 rows, 0 bad rows
CIQUAL full import: 3,186 rows seen, 3,185 CIQUAL foods in the dev database, 0 bad rows
Baseline seed_all: passed after CIQUAL import
Dev database totals after seeding: 3,207 foods, 3,185 CIQUAL foods, 28 nutrients, 11 supplements, 9 active rules
Admin production dependency audit: 0 vulnerabilities
Mobile production dependency audit: 0 vulnerabilities
Secret scan: passed
Production Compose config: passed
```

The dev database currently contains the imported CIQUAL data.

## Production Deployment Steps Left

Copy `.env.production.example` to `.env` and fill real values.

Important required values:

```txt
API_DOMAIN
ADMIN_DOMAIN
LOGS_DOMAIN
VITE_API_BASE_URL
EXPO_PUBLIC_API_BASE_URL
TRAEFIK_ACME_EMAIL
ADMIN_EMAIL
ADMIN_NAME
ADMIN_PASSWORD
DOZZLE_BASIC_AUTH
DJANGO_SECRET_KEY
POSTGRES_PASSWORD
```

Then run:

```powershell
make validate-production-env ENV_FILE=.env
make check-dns
make deploy
make verify-production
```

For a remote VPS workflow:

```powershell
make bootstrap-vps HOST=your.vps.ip REPO_URL=https://github.com/your-org/your-repo.git
make deploy-remote HOST=your.vps.ip
```

## What To Ask ChatGPT Next

You can ask ChatGPT:

```txt
Read CHATGPT_PROJECT_HANDOFF.md and NEXT_SESSION_HANDOFF.md, then continue from the remaining VPS/domain deployment tasks.
```

Or:

```txt
Review the project and suggest useful features I can add next.
```

## Good Features To Add Next

Here are strong next feature ideas:

1. Favorite recommendations
   - Let users save recommended foods.
   - Add saved/favorite list in mobile.
   - Add admin insight into most-saved foods.

2. Meal plan builder
   - Turn recommendations into daily/weekly meal suggestions.
   - Let users choose breakfast/lunch/dinner.

3. Barcode scanner
   - Mobile scanner for packaged foods.
   - Match scanned food to nutrients or warnings.

4. Better personalization
   - Use feedback history to adjust future recommendation scores.
   - Lower score for foods repeatedly marked not helpful.

5. Food images
   - Add real image uploads or image URL management in admin.
   - Show richer recommendation cards in mobile.

6. Push notifications
   - Remind users to add supplements or check recommendations.
   - Notify when a new suggestion is available.

7. CSV import for admin
   - Import foods, nutrients, supplements, or rules from CSV.
   - Add validation and import preview.

8. Export reports
   - Admin exports analytics, feedback, or recommendation logs.

9. Role-based admin permissions
   - Separate superadmin, nutrition editor, and viewer roles.

10. Production monitoring
   - Add Sentry or similar error tracking.
   - Add uptime checks and better health diagnostics.

11. Mobile offline cache
   - Keep recent recommendations available without network.

12. Nutrition safety improvements
   - Add warnings for timing conflicts.
   - Add stronger disclaimers for sensitive supplements.

## Recommended Next Practical Step

The most useful next step is deployment:

1. Start Docker Desktop.
2. Rerun backend checks.
3. Fill `.env`.
4. Deploy to VPS.
5. Verify live domains.
6. Test mobile against production API.

After production works, the best product feature to add is probably:

```txt
Favorite recommendations
```

It is small, demo-friendly, and fits the current data model naturally.
