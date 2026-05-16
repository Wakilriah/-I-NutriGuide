# Logical Build Plan

This file records the intended build order and the current project status. Earlier sprints are complete locally; do not reopen them unless a regression or explicit new requirement appears.

## Current Status

Local implementation is complete and verified. The only remaining work requires the real VPS, production `.env`, and live domain/DNS access.

Remaining deployment tasks:

1. Run migrations on VPS.
2. Seed data on VPS.
3. Create production superuser.
4. Verify API domain.
5. Verify admin domain.
6. Verify Dozzle domain protection.
7. Verify mobile app reaches the deployed API.

## Sprint 1 - Foundation

Status: complete.

Delivered:

1. Monorepo folders.
2. Backend Django project.
3. PostgreSQL/Redis Docker Compose.
4. Health endpoint.
5. Admin Vite project.
6. Basic README.

Verified:

- Backend health endpoint works.
- Docker Compose development stack starts when Docker Desktop is running.
- Admin app renders and tests pass.

## Sprint 2 - Auth and Profiles

Status: complete.

Delivered:

1. Django registration, login, refresh, and current-user endpoints.
2. JWT setup with access/refresh token handling.
3. Custom email-based user model.
4. UserProfile, allergies, dietary restrictions, and disliked foods.
5. Admin login page and protected admin session.
6. Mobile login/register screens with secure token persistence.

Verified:

- Backend auth/profile tests pass.
- Admin auth tests pass.
- Mobile auth tests pass.

## Sprint 3 - Knowledge Base

Status: complete.

Delivered:

1. Nutrients backend.
2. Foods and food categories backend.
3. Supplements backend.
4. Association rules backend.
5. Seed commands.
6. Admin CRUD pages for nutrients, foods, supplements, and rules.

Verified:

- Backend CRUD tests pass.
- Admin CRUD tests pass.
- Seed commands are covered by tests.

## Sprint 4 - User Supplements

Status: complete.

Delivered:

1. UserSupplement backend API.
2. Mobile supplements list.
3. Mobile add/edit/delete supplement flow.
4. Loading, error, and empty states.

Verified:

- Backend user supplement tests pass.
- Mobile supplement route tests pass.

## Sprint 5 - Recommendation Engine

Status: complete.

Delivered:

1. RecommendationRun and RecommendationItem models.
2. Allergy, restriction, dislike, and inactive-food filtering.
3. Nutrient scoring.
4. Association rule scoring.
5. Preference scoring.
6. Explanation generation.
7. Generate endpoint.
8. History and detail endpoints.
9. Mobile recommendation list/detail screens.
10. Recommendation caching and invalidation.

Verified:

- Backend recommendation tests pass.
- Mobile recommendation tests pass.
- Recommendation disclaimer and safe explanations are included.

## Sprint 6 - Feedback and Analytics

Status: complete.

Delivered:

1. Feedback backend.
2. Analytics backend.
3. Mobile feedback form.
4. Admin dashboard.
5. Admin recommendation logs.
6. Admin feedback list.

Verified:

- Backend feedback/analytics tests pass.
- Admin dashboard/recommendation/feedback tests pass.
- Mobile feedback path is covered through recommendation detail tests.

## Sprint 7 - DevOps Production

Status: locally complete; live VPS validation remains.

Delivered locally:

1. Production Dockerfiles.
2. Traefik config.
3. Dozzle config with Basic Auth.
4. Production Compose.
5. Deployment, remote deployment, post-deploy, DNS, verification, backup, restore, and env validation scripts.
6. Production env example.
7. Production superuser management command.

Verified locally:

- Production Compose config validates.
- Secret scan passes.
- PowerShell helper scripts parse.
- Production backend Docker build passed in the last Docker-enabled verification.
- Production Django deploy check passed with only optional HSTS preload warning.

Blocked until real deployment access:

- VPS migrations.
- VPS seed data.
- VPS superuser creation.
- Live API/admin/logs domain verification.
- Mobile app verification against deployed API.

## Sprint 8 - Final Demo Polish

Status: local demo polish complete.

Delivered:

1. Admin UI and mobile flows for the full demo path.
2. Realistic seed data.
3. Final README and guide updates.
4. Safe recommendation explanations and disclaimer.
5. Documentation mirrored under `docs/`.
6. Handoff file for the next session.

Verified:

- Backend tests: 47 passed.
- Admin tests: 15 passed.
- Mobile tests: 54 passed.
- Mobile typecheck passed in previous verification.
- Expo dependency check passed in previous verification.
- Secret scan passes.

## Next Action

Fill a real `.env` from `.env.production.example`, ensure DNS points at the VPS, then run:

```powershell
make validate-production-env ENV_FILE=.env
make check-dns
make deploy
make verify-production
```

If deploying remotely from this machine:

```powershell
make bootstrap-vps HOST=your.vps.ip REPO_URL=https://github.com/your-org/your-repo.git
make deploy-remote HOST=your.vps.ip
```
