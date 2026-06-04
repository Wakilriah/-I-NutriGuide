# I-NutriGuide Mobile UI Stitch Parity Checklist

Source of truth:
`desing/stitch_i_nutriguide_ai_wellness_app (1)/stitch_i_nutriguide_ai_wellness_app`

## Stitch Files Audited

- `vitality_flow_1/DESIGN.md`
- `vitality_flow_2/DESIGN.md`
- `welcome_screen/code.html`, `welcome_screen/screen.png`
- `onboarding_experience/code.html`, `onboarding_experience/screen.png`
- `home_dashboard/code.html`, `home_dashboard/screen.png`
- `home_dashboard_with_tracking_1/code.html`, `home_dashboard_with_tracking_1/screen.png`
- `my_supplements_1/code.html`, `my_supplements_1/screen.png`
- `add_supplement/code.html`, `add_supplement/screen.png`
- `food_recommendations/code.html`, `food_recommendations/screen.png`
- `food_recommendations_improved_1/code.html`, `food_recommendations_improved_1/screen.png`
- `why_this_food/code.html`, `why_this_food/screen.png`
- `why_this_food_improved/code.html`, `why_this_food_improved/screen.png`
- `track_dashboard_1/code.html`, `track_dashboard_1/screen.png`
- `water_steps_tracker/code.html`, `water_steps_tracker/screen.png`
- `food_diary/code.html`, `food_diary/screen.png`
- `add_food_log/code.html`, `add_food_log/screen.png`
- `user_profile/code.html`, `user_profile/screen.png`
- `feedback_modal/code.html`, `feedback_modal/screen.png`
- `loading_recommendations/code.html`, `loading_recommendations/screen.png`
- `ai_nutrition_chat_1/code.html`, `ai_nutrition_chat_1/screen.png`

## Design System Notes

- Colors: primary green `#006B23`, primary container `#098730`, orange CTA `#FDA611`, mint/page surface `#F7F9FF` plus tracking mint `#F4FCE3`, warm beige `#FFF7EA`, charcoal text `#121D26`, outline `#BECAB9`.
- Typography: rounded Quicksand-like bold headings; Plus Jakarta Sans-like body and labels. React Native currently approximates with system font weights.
- Shape: ultra-rounded cards, pill buttons/chips, floating rounded dock.
- Elevation: soft green-tinted card shadows and stronger floating shadows for dock/FAB.
- Images: food photography should be prominent on welcome, recommendations, details, and add/log flows.

## Screen Audit

| Screen | Current Match | Required Work |
| --- | --- | --- |
| Welcome `app/index.tsx` | Match | Centered logo/title/tagline, full food background, green overlay, orange CTA, glass login link. |
| Sign In `app/auth/login.tsx` | Match | Shared food background, green overlay, translucent rounded card, orange primary action. |
| Create Account `app/auth/register.tsx` | Match | Shared food background, green overlay, translucent rounded card, orange primary action. |
| Onboarding Profile `app/onboarding/profile.tsx` | Match | Rebuilt with Stitch progress, centered headline, large rounded option cards, rounded form card, orange CTA. |
| Onboarding Goals `app/onboarding/goals.tsx` | Match | Rebuilt with large beige goal cards, activity/diet chips, progress, disclaimer. |
| Onboarding Allergies `app/onboarding/allergies.tsx` | Match | Rebuilt with beige/white cards, rounded chips, safety copy, orange CTA. |
| Onboarding Disliked Foods `app/onboarding/disliked-foods.tsx` | Match | Rebuilt with rounded search/card/chips/list and orange final CTA. |
| Home `app/tabs/home.tsx` | Match | Rebuilt around Stitch sections: greeting, next supplement, nutrition tip, safety alert, quick actions, horizontal recommended food cards, compact tracking summary. |
| Supplements `app/tabs/supplements.tsx` | Match | Rebuilt My Supplements cards with time chip, recommended foods, avoid notes, interaction note, safety section, floating add button. |
| Add Supplement `app/supplements/new.tsx` | Match | Added Stitch hero image, rounded selected supplement form cards, timing chips, orange save CTA, pro tip card, quick stats card while preserving catalog logic. |
| Supplement Detail `app/supplements/[id].tsx` | Match | Uses shared supplement card, food-combine card, timing guidance, rounded selectors, and orange/green actions. |
| Recommendations `app/tabs/recommendations.tsx` | Match | Uses food image cards, match/confidence/supplement chips, timing and meal cards, and green insight-style explanation blocks. |
| Recommendation Detail `app/recommendations/[runId].tsx` | Match | Added Why This Food framing, image hero, circular match, score cards, score breakdown through shared recommendation cards. |
| Track Dashboard `app/tabs/tracking.tsx` | Match | Includes summary, progress rings, quick actions, water, steps, macros, diary, AI FAB. |
| Add Food `app/tabs/log-food.tsx` | Match | Added Log Meal quick tiles, manual rounded form fields, meal tabs, macro panel, notes, save button, and retained backend search/add flow. |
| Food Diary `app/tabs/history.tsx` | Match | Added grouped meal diary section with meal totals and food rows; trend history remains below as extra analytics. |
| Water Tracker | Match/Combined | Covered in Track with water card and add-glass action using existing tracking API. |
| Steps Tracker | Match/Combined | Covered in Track with progress ring and manual save using existing tracking API. |
| Profile `app/tabs/profile.tsx` | Match | Rebuilt with large avatar, edit badge, stats cards, preference/saved/history/settings rows, bottom logout. |
| Saved Foods `app/tabs/saved.tsx` | Match | Uses shared FoodCard photography, rounded saved cards, match chips, and action buttons. |
| Chat `app/tabs/chat.tsx` | Match | Rebuilt with green assistant hero, rounded bubbles, quick prompts, and floating input dock. |
| Notifications `app/tabs/notifications.tsx` | Match | Uses shared header, rounded notification rows, green icons, and soft shadows. |
| Profile Info/Settings `app/tabs/profile-info.tsx`, `profile-settings.tsx` | Match | Uses shared form/card style, chips, rounded tiles, settings cards, and logout action. |

## Shared Components Audit

- Present/updated: `AppHeader`, `WellnessCard`, `PrimaryButton`, `SecondaryButton`, `FoodCard`, `SupplementCard`, `SafetyAlertCard`, `ProgressRing`, `MacroProgressBar`, `TrackingCard`, `WaterTrackerCard`, `StepProgressCard`, `FoodLogItem`, `ReasonChip`, `ScoreBreakdownCard`, `EmptyState`, `FeedbackModal`.
- Still needed: make `BottomTabBar` explicit or keep Expo Tabs configured as the shared floating dock; use shared components more consistently across old screens.
- Old style source to remove from screens: `react-native-ui-lib` imports in onboarding and chat.
