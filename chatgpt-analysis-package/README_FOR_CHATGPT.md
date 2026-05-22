# I-NutriGuide Analysis Package

This folder is a curated snapshot of the I-NutriGuide application for review and analysis.

## What This App Is

I-NutriGuide is an AI-powered nutrition app. Users enter their supplements, profile, goals, allergies, dietary restrictions, disliked foods, and daily tracking. The app recommends foods that pair well with supplements and shows progress graphs. It also includes an admin panel for users, recommendations, rules, feedback, and chat monitoring.

## Main Parts

- `source-snapshot/mobile-app/` - Expo React Native mobile app.
- `source-snapshot/backend/` - Django REST Framework API.
- `source-snapshot/admin-panel/` - React/Vite admin dashboard.
- `docs/` - architecture, API, database, backend, mobile, admin, and deployment docs.
- `configs/` - Docker Compose and environment examples.

## Important Screens / Features

- Mobile auth: login/register.
- Mobile tabs: home, supplements, recommendations, saved, chat, tracking, profile.
- Profile: validated body data, allergies, restrictions, disliked food search, progress graphs.
- Tracking: daily nutrition, water, protein, calories, weight, supplements taken.
- Chat: user AI chat with daily limit and clear history.
- Admin: users, rules, foods, nutrients, feedback, recommendations, categorized user chats.
- Backend: recommendations, supplements, profile, tracking, chat, analytics.

## Things To Analyze

1. Overall architecture and whether the app is organized well.
2. Backend API design and security risks.
3. Mobile UI/UX quality and navigation flow.
4. Database models and migrations.
5. Recommendation logic and chat flow.
6. Admin panel usefulness and missing tools.
7. Test coverage gaps.
8. Docker/local LAN setup problems.
9. Production-readiness concerns.

## Notes

This package intentionally excludes real `.env` secrets, `node_modules`, large seed data, and generated caches.

