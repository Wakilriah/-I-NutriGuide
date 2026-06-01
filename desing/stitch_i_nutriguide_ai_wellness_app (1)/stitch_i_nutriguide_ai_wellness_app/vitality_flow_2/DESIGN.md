---
name: Vitality Flow
colors:
  surface: '#f7f9ff'
  surface-dim: '#d7dadf'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f9'
  surface-container: '#ebeef3'
  surface-container-high: '#e5e8ee'
  surface-container-highest: '#e0e3e8'
  on-surface: '#181c20'
  on-surface-variant: '#3f4a3d'
  inverse-surface: '#2d3135'
  inverse-on-surface: '#eef1f6'
  outline: '#6f7a6c'
  outline-variant: '#becab9'
  surface-tint: '#006e24'
  primary: '#006b23'
  on-primary: '#ffffff'
  primary-container: '#098730'
  on-primary-container: '#f7fff1'
  inverse-primary: '#71dd7a'
  secondary: '#845400'
  on-secondary: '#ffffff'
  secondary-container: '#fda611'
  on-secondary-container: '#684100'
  tertiary: '#4c605b'
  on-tertiary: '#ffffff'
  tertiary-container: '#657973'
  on-tertiary-container: '#f4fffa'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#8dfa94'
  primary-fixed-dim: '#71dd7a'
  on-primary-fixed: '#002106'
  on-primary-fixed-variant: '#005319'
  secondary-fixed: '#ffddb6'
  secondary-fixed-dim: '#ffb95b'
  on-secondary-fixed: '#2a1800'
  on-secondary-fixed-variant: '#643f00'
  tertiary-fixed: '#d1e7e0'
  tertiary-fixed-dim: '#b6cbc5'
  on-tertiary-fixed: '#0c1f1b'
  on-tertiary-fixed-variant: '#374b46'
  background: '#f7f9ff'
  on-background: '#181c20'
  surface-variant: '#e0e3e8'
typography:
  display-lg:
    fontFamily: Quicksand
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Quicksand
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Quicksand
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style
The brand personality is optimistic, energetic, and nurturing, designed to feel like a supportive wellness companion. It targets health-conscious individuals who value clarity and approachability in their fitness and nutrition journey. 

The design style combines **Minimalism** with **Tactile** elements. It utilizes ample whitespace and a soft, mint-tinted color palette to reduce cognitive load, while subtle depth and rounded shapes create a friendly, "squishy" feel that invites interaction. The aesthetic is clean and modern, avoiding clinical coldness in favor of a warm, human-centric interface.

## Colors
The palette is rooted in nature and vitality. 
- **Primary Green (#2F9E44):** Used for positive progress, primary actions, and success states.
- **Secondary Orange (#F59F00):** Used for attention-grabbing metrics, active streaks, and mid-level progress.
- **Soft Red (#FA5252):** Introduced specifically for subtle warnings, missed targets, or items requiring immediate correction without inducing panic.
- **Mint Backgrounds:** Surface colors leverage a very pale mint/lime wash (#F4FCE3) to differentiate the interface from standard "SaaS white" and reinforce the wellness narrative.

## Typography
The typography system balances character with high legibility.
- **Headings (Quicksand):** The rounded terminals of Quicksand provide a soft, welcoming, and athletic feel. Use Bold weights for Display and Headline levels to anchor the page.
- **Body & Labels (Plus Jakarta Sans):** This typeface offers a more structured, modern contrast to the headings, ensuring that data-heavy tracking views remain clear and professional.
- **Hierarchy:** Use `display-lg` for daily goal summaries and `label-md` for uppercase category tags.

## Layout & Spacing
The design system utilizes a **fluid grid** with a 4px baseline rhythm.
- **Mobile:** 4-column grid with 20px side margins and 16px gutters.
- **Desktop:** 12-column grid with a max-width of 1200px.
- **Tracking Layouts:** Use cards that span 2 columns on mobile and 3-4 columns on desktop to create a "dashboard" feel. Elements within cards should use `spacing.md` (16px) for internal padding to maintain a breathable, open atmosphere.

## Elevation & Depth
Depth is created through **Ambient Shadows** and tonal layering. 
- **Surface Level 0:** The mint background (#F4FCE3).
- **Surface Level 1 (Cards):** White (#FFFFFF) with a very soft, diffused shadow (0px 4px 20px rgba(47, 158, 68, 0.08)). The shadow should have a slight green tint to blend with the background.
- **Interactive Elements:** Buttons and FABs use a slightly more pronounced shadow (0px 8px 24px rgba(0, 0, 0, 0.12)) to indicate "pressability."
- **Glassmorphism:** Use a 12px backdrop blur for the bottom navigation bar to allow background colors to peek through subtly.

## Shapes
This design system uses **Rounded** (Level 2) geometry to reinforce its friendly and approachable brand voice. 
- **Standard UI elements:** 8px (0.5rem) corner radius.
- **Large Cards & Tracking Containers:** 16px (1rem) corner radius.
- **Inputs & Progress Bars:** Fully pill-shaped (rounded-full) to emphasize movement and flow.

## Components
### Tracking & Progress
- **Circular Progress Rings:** Used for primary daily goals (e.g., Calories, Steps). Use a 12pt stroke width with rounded caps. The track should be a 10% opacity version of the progress color.
- **Macro Progress Bars:** Horizontal pill-shaped bars. Use Primary Green for Protein, Secondary Orange for Carbs, and a muted Neutral for Fats.
- **Tracking Cards:** White containers with a 16px radius. They must include a clear `label-md` header and a high-contrast `headline-md` value.

### Navigation & Actions
- **Tab Bar:** Include four primary destinations: Home, Track (New), Insights, and Profile. The 'Track' tab is the central hub for manual logging.
- **AI Chat FAB:** A floating action button positioned at the bottom right. It should be a circular button using the Primary Green background with a white icon, elevated higher than other elements to signify its "always available" status.

### Interaction Elements
- **Buttons:** Primary buttons are pill-shaped with Quicksand Bold text.
- **Chips:** Used for filtering activity types; use Level 2 roundedness and a background of 10% Primary Green when active.