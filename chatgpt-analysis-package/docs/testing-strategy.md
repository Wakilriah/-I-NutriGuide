# Testing Strategy

## Testing Philosophy

The project must be built feature-by-feature. Every completed feature must have tests. A checklist item should not be marked complete until its relevant tests pass.

## Backend Testing

Tools:

- pytest
- pytest-django
- factory_boy
- DRF APIClient
- coverage

Run:

```sh
cd apps/backend
pytest
```

Docker-backed command:

```sh
docker compose -f docker-compose.dev.yml run --rm backend python -m pytest
```

Required backend test categories:

### Auth Tests

- Register user successfully.
- Login returns JWT tokens.
- Invalid login fails.
- Authenticated `/me` returns user.
- Unauthenticated `/me` fails.

### Permission Tests

- Normal user cannot access admin endpoints.
- Admin can access CRUD endpoints.
- User cannot access another user's data.

### Food Tests

- Admin can create food.
- Admin can update food.
- Admin can deactivate food.
- Public/mobile can list active foods.
- Inactive foods are excluded from recommendations.

### Supplement Tests

- Admin can create supplement.
- User can add active supplement to profile.
- User can deactivate supplement.

### Recommendation Tests

- Recommendation endpoint requires auth.
- User with no supplements gets helpful response.
- Recommendation returns disclaimer.
- Recommendation returns explanations.
- Allergy filtering works.
- Diet restriction filtering works.
- Association rule affects ranking.
- Disabled rule is ignored.
- Cached recommendation is returned when input hash is unchanged.

### Feedback Tests

- User can submit feedback for own recommendation item.
- User cannot submit feedback for another user's item.
- Admin can list feedback.

## Admin Panel Testing

Tools:

- Vitest
- React Testing Library
- MSW for API mocking

Run:

```sh
cd apps/admin-panel
npm run test
```

Required admin tests:

- Login form validates required fields.
- Authenticated layout renders sidebar.
- Unauthenticated users are redirected.
- Foods list renders loading, error, empty, and success states.
- Create food form validates and submits.
- Supplements list renders.
- Rules form validates support/confidence/lift.
- Dashboard metric cards render.

## Mobile Testing

Tools:

- Jest
- React Native Testing Library
- MSW or mocked API module

Run:

```sh
cd apps/mobile-app
npm run test
```

Required mobile tests:

- Login form validates required fields.
- Register form validates email/password.
- Onboarding profile form validates.
- Add supplement flow sends correct payload.
- Recommendation card renders explanation.
- Disclaimer is visible on recommendation screen.
- Feedback form submits rating.

## Integration Testing

After related features are complete, test manually against Docker Compose:

```txt
1. Start Docker Compose.
2. Run migrations.
3. Seed data.
4. Create admin user.
5. Login to admin panel.
6. Create/edit a food.
7. Create/edit a supplement.
8. Create/edit an association rule.
9. Register mobile user.
10. Complete profile.
11. Add supplement.
12. Generate recommendations.
13. Submit feedback.
14. Verify admin analytics update.
15. Check logs in Dozzle.
```

## Definition of Done

A feature is done only if:

- Code is implemented.
- Unit/API/component tests are added.
- Tests pass.
- Feature works in Docker environment.
- No major TypeScript/Python lint errors.
- API schema remains valid.
- Checklist is updated.

## Recommended Commands

Root-level Makefile commands:

```sh
make dev
make test
make test-backend
make test-admin
make test-mobile
make lint
make migrate
make seed
make seed-demo
make check-secrets
make prod-config
```

On Windows, run the equivalent commands directly if `make` is not installed. Backend test and lint targets use Docker Compose, so Docker Desktop must be running for those commands.

Current verified local suites:

```txt
Backend: 47 tests passed
Admin: 15 tests passed
Mobile: 54 tests passed
Admin lint: passed
Admin production dependency audit: 0 vulnerabilities
Mobile production dependency audit: 0 vulnerabilities
```
