# I-NutriGuide UI and Product Analysis Handoff

Use this document as context for ChatGPT, a designer, or an analyst to review the current app and suggest improvements.

## Product Summary

I-NutriGuide is an AI-powered nutrition recommendation app. It recommends foods that complement a user's supplements while considering allergies, diet restrictions, preferences, goals, and nutrient synergy.

The recommendation concept combines:

- Content-based filtering using user profile, supplements, food nutrients, allergies, disliked foods, calories, and goals.
- Association rules for supplement-food and nutrient-food relationships.
- User feedback and recommendation history to improve future matches.

The app has two main surfaces:

- Mobile app: React Native Expo app for users.
- Admin panel: React/Vite dashboard for managing foods, supplements, nutrients, association rules, users, recommendations, and feedback.

## Current Theme Direction

The latest UI redesign is inspired by colorful healthy bowls, green vegetables, orange proteins, fruits, and a premium wellness feeling.

Design goals:

- Modern healthy nutrition app.
- Fresh, clean, friendly, trustworthy.
- Avoid hospital/medical feeling.
- Use food imagery, rounded cards, soft shadows, green/mint/cream backgrounds, and orange match badges.

Primary palette:

- Primary green: `#2F7D32`
- Fresh green: `#6BBF59`
- Light mint background: `#F3FAF3`
- Cream background: `#FFF8ED`
- Orange accent: `#F28C28`
- Tomato red accent: `#D94F30`
- Dark text: `#1F2A1F`
- Muted text: `#6B756B`
- Card white: `#FFFFFF`

## Mobile App UI

Important screens:

- Welcome/onboarding entry screen with food image background and “Eat Healthy”.
- Home screen with greeting, search, daily supplement card, recommended food cards, nutrient synergy explanation.
- Recommendations screen with filters for allergies, diet type, goal, calories.
- Recommendation detail screen with selected supplement, best food pairings, nutrients, match score, and absorption reason.
- Supplement detail screen with best foods to combine, foods to avoid/separate, and simple explanation.
- Profile/preferences screen with allergies, diet type, health goal, and food preferences.

Reusable mobile components:

- `AppButton`
- `AppCard`
- `FoodCard`
- `SupplementCard`
- `Badge`
- `SearchInput`
- `FilterChip`
- `SectionHeader`
- `RecommendationCard`
- `EmptyState`
- `LoadingState`
- `ErrorState`

Mobile theme files:

- `apps/mobile-app/src/theme/design.ts`
- `apps/mobile-app/src/components/ui.tsx`

## Admin Panel UI

Admin panel theme now uses the same green/orange wellness identity.

Important admin sections:

- Dashboard metrics.
- Food management table/forms.
- Supplement management table/forms.
- Nutrient management.
- Association rules with support/confidence/lift meters.
- Recommendation logs with score meters.
- Feedback and users.

Admin theme file:

- `apps/admin-panel/src/styles.css`

Admin layout/dashboard files:

- `apps/admin-panel/src/components/AdminLayout.tsx`
- `apps/admin-panel/src/features/dashboard/DashboardPage.tsx`

## How To Run Locally

From the project root:

```powershell
make start-local
```

Useful URLs:

- Backend API: `http://localhost:8000`
- Backend health: `http://localhost:8000/api/v1/health/`
- Admin panel: `http://localhost:5173`
- Expo mobile dev server: `http://localhost:8081`
- Phone Expo URL: `exp://192.168.1.9:8081`

Admin login:

```txt
Email: riahwakil@gmail.com
Password: NutriGuide!2026-Riah
```

If mobile does not refresh:

```powershell
cd apps/mobile-app
npx expo start -c
```

## Latest Verification

The current redesign passed:

- Mobile typecheck.
- Mobile tests: 54 passed.
- Admin tests: 15 passed.
- Admin lint.
- Admin production build.

## Files Recently Changed For UI Theme

- `apps/mobile-app/src/theme/design.ts`
- `apps/mobile-app/src/components/ui.tsx`
- `apps/mobile-app/src/components/Screen.tsx`
- `apps/mobile-app/src/components/ButtonLink.tsx`
- `apps/mobile-app/app/index.tsx`
- `apps/mobile-app/app/tabs/home.tsx`
- `apps/mobile-app/app/tabs/recommendations.tsx`
- `apps/mobile-app/app/recommendations/[runId].tsx`
- `apps/mobile-app/app/supplements/[id].tsx`
- `apps/mobile-app/app/tabs/profile.tsx`
- `apps/mobile-app/app/tabs/_layout.tsx`
- `apps/admin-panel/src/styles.css`
- `apps/admin-panel/src/features/dashboard/DashboardPage.tsx`
- `apps/admin-panel/src/components/AdminLayout.tsx`
- `11_FEATURE_CHECKLIST.md`

## Suggested Analysis Prompts

Use one of these prompts with ChatGPT or an analyst.

### UI/UX Critique Prompt

Review this app concept and UI direction. Suggest improvements for mobile UX, visual hierarchy, component consistency, accessibility, onboarding clarity, and trust. The app is a nutrition recommendation product that matches foods with supplements using nutrient synergy, allergies, preferences, and association rules. The theme is modern healthy wellness with green/mint/cream/orange colors, food-image cards, rounded 20px cards, and friendly copy.

### Product Strategy Prompt

Analyze I-NutriGuide as a nutrition recommendation product. Suggest features that would improve user value, retention, personalization, and trust. Focus on supplement-food pairing, allergies, goals, food preferences, safety disclaimers, feedback loops, and admin knowledge-base quality.

### Analytics Prompt

Suggest an analytics plan for I-NutriGuide. Define key events, funnels, retention metrics, recommendation-quality metrics, feedback metrics, and admin quality metrics. Include what should be tracked in onboarding, supplement setup, recommendation generation, recommendation detail views, food-card interactions, feedback submission, and admin rule edits.

### Feature Ideas Prompt

Suggest new features for I-NutriGuide that fit a premium wellness app. Prioritize ideas by impact and effort. Consider meal planning, supplement timing, grocery list export, favorite foods, avoid/separate warnings, nutrient explanations, user feedback learning, wearable integration, and admin data-quality tools.

## Initial Feature Suggestions

High impact:

- Favorite foods and “not for me” controls on recommendation cards.
- Supplement timing guidance, including foods to separate.
- Grocery list generated from recommended foods.
- Weekly meal plan based on active supplements and goals.
- Explanation quality scoring in admin.
- Recommendation feedback dashboard by food, supplement, and rule.

Medium impact:

- Calorie and macro filters.
- Halal/vegan/vegetarian quick presets.
- “Why this match?” expandable nutrient explanation.
- Daily reminder for supplement and food pairing.
- Confidence labels such as “Best Pair”, “Good Match”, “Needs Review”.

Admin improvements:

- Rule impact preview before saving.
- Data completeness score for foods and supplements.
- Flag low-confidence recommendation runs.
- Import/export tools for supplement-food relationships.
- Visual graph of nutrient/supplement/food connections.

## Open Questions For Review

- Does the UI feel more like wellness/nutrition than medical software?
- Are recommendation explanations simple enough for non-experts?
- Are filters clear and actionable?
- Are food cards informative without becoming crowded?
- Should the app prioritize daily routine, goals, or supplement selection on the home screen?
- What analytics should be added before launch?
- Which premium feature would make the product feel most valuable?
