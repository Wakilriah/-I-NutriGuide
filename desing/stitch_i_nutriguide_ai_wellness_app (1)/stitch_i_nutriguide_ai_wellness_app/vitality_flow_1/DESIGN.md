---
name: Vitality Flow
colors:
  surface: '#f7f9ff'
  surface-dim: '#d1dbe8'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e4effd'
  surface-container-high: '#dfe9f7'
  surface-container-highest: '#d9e3f1'
  on-surface: '#121d26'
  on-surface-variant: '#3f4a3d'
  inverse-surface: '#27313c'
  inverse-on-surface: '#e8f2ff'
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
  tertiary: '#276929'
  on-tertiary: '#ffffff'
  tertiary-container: '#418340'
  on-tertiary-container: '#f7fff1'
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
  tertiary-fixed: '#acf4a4'
  tertiary-fixed-dim: '#91d78a'
  on-tertiary-fixed: '#002203'
  on-tertiary-fixed-variant: '#0c5216'
  background: '#f7f9ff'
  on-background: '#121d26'
  surface-variant: '#d9e3f1'
typography:
  display-lg:
    fontFamily: Quicksand
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
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
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  stack-gap: 16px
  section-gap: 40px
  gutter: 16px
---

## Brand & Style
The design system is centered on a "Living Wellness" philosophy, moving away from clinical, cold medical interfaces toward a warm, organic, and life-affirming aesthetic. It targets health-conscious individuals who seek a partnership with AI that feels human and encouraging rather than robotic or prescriptive.

The visual style is **Modern Organic Minimalism**. It utilizes heavy whitespace to create a sense of "breathability," high-quality food photography to inspire appetite, and soft, tactile UI elements that feel approachable. The emotional response should be one of "calm empowerment"—users should feel that their health journey is natural, manageable, and vibrant.

## Colors
The palette is rooted in nature. The **Primary Green** represents vitality and growth, used for primary actions and success states. **Deep Green** provides an authoritative, grounded anchor for typography.

**Orange Accent** is used sparingly but strategically for Primary CTAs and highlights to provide a warm, energetic contrast to the greens. Backgrounds utilize a dual-tone strategy: **Soft Mint** for high-level page surfaces to maintain freshness, and **Warm Beige** for secondary card containers to add a sense of kitchen-side comfort. Text is kept in a soft **Dark Charcoal** rather than pure black to maintain the organic feel.

## Typography
This design system uses **Quicksand** for all headings to leverage its rounded terminals, which evoke friendliness and a "soft-touch" premium feel. For body copy and functional labels, **Plus Jakarta Sans** is employed to ensure high legibility and a modern, clean execution that balances the playfulness of the headers.

Hierarchy is established through significant size contrast. Display styles should be used for daily goals or nutrient summaries, while body text remains spacious and easy to scan.

## Layout & Spacing
The layout follows a **Fluid-Fixed Hybrid** model. On mobile, content uses a 24px side margin to create a "contained" and premium feel. On desktop, content is restricted to a 1200px max-width container, centered.

Spacing follows an 8px base grid. Larger "Section Gaps" (40px+) are encouraged between different content types (e.g., between "Daily Progress" and "Recommended Recipes") to maintain the clean, minimalist aesthetic. Content should never feel cramped; use generous padding within cards to allow imagery and text to coexist without tension.

## Elevation & Depth
Depth is communicated through **Soft Ambient Shadows** and **Tonal Layering** rather than harsh outlines.
- **Surface Level 0:** The Soft Mint page background.
- **Surface Level 1:** Warm Beige or White cards with a very soft, diffused shadow (15% opacity Deep Green tint) to create a subtle lift.
- **Surface Level 2:** Floating elements like the Bottom Navigation Bar or active Modals, featuring a more pronounced but still soft shadow.

Avoid hard borders. Use subtle color shifts in backgrounds to define areas where possible.

## Shapes
The shape language is **Ultra-Rounded**. Standard cards use a 24px corner radius to mimic the organic curves found in nature (fruits, leaves, bowls). Smaller components like chips and buttons utilize a full pill-shape (circular ends) to maximize the "friendly" and "approachable" brand personality. This lack of sharp corners removes visual "aggression" from the AI interface.

## Components
- **Primary Buttons:** Pill-shaped, using the Orange Accent with white text. Apply a subtle lift effect on hover/active states.
- **Nutrition Cards:** 24px rounded corners. Use high-resolution food imagery as a top-half or full-background element. Text should be housed on a semi-transparent white overlay or a solid Warm Beige footer.
- **Input Fields:** Soft Mint or White backgrounds with 16px rounding. Use Deep Green for focus states.
- **Bottom Navigation:** A floating dock style with 32px rounding. Icons should be "chunky" and rounded, using the Deep Green for the active state and a muted version for inactive.
- **Badges/Chips:** Used for dietary labels (e.g., "Vegan," "High Protein"). These are small pill-shapes with Primary Green backgrounds and white text.
- **Progress Rings:** Use the Primary Green for progress, with a light mint track to visualize nutrient intake goals.
- **AI "Guide" Tooltips:** These should feature a subtle green-to-mint gradient background and rounded corners, appearing as helpful, floating bubbles of information.