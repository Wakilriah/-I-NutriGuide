---
name: Vitality Glass
colors:
  surface: '#effded'
  surface-dim: '#d0dece'
  surface-bright: '#effded'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e9f8e7'
  surface-container: '#e4f2e1'
  surface-container-high: '#deecdc'
  surface-container-highest: '#d8e6d6'
  on-surface: '#131e14'
  on-surface-variant: '#40493d'
  inverse-surface: '#273328'
  inverse-on-surface: '#e7f5e4'
  outline: '#707a6c'
  outline-variant: '#bfcaba'
  surface-tint: '#1d6d24'
  primary: '#0f631b'
  on-primary: '#ffffff'
  primary-container: '#2f7d32'
  on-primary-container: '#ccffc2'
  inverse-primary: '#88d982'
  secondary: '#914d00'
  on-secondary: '#ffffff'
  secondary-container: '#fc9430'
  on-secondary-container: '#663500'
  tertiary: '#a2280b'
  on-tertiary: '#ffffff'
  tertiary-container: '#c44022'
  on-tertiary-container: '#ffeeea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a3f69c'
  primary-fixed-dim: '#88d982'
  on-primary-fixed: '#002203'
  on-primary-fixed-variant: '#005311'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a3'
  on-tertiary-fixed: '#3d0600'
  on-tertiary-fixed-variant: '#8b1a00'
  background: '#effded'
  on-background: '#131e14'
  surface-variant: '#d8e6d6'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  stack-gap: 16px
  section-gap: 32px
  gutter: 12px
---

## Brand & Style
The design system embodies a **Modern Premium Wellness** aesthetic, targeting health-conscious individuals who seek a balance between scientific precision and organic warmth. The visual narrative moves away from the sterile, clinical feel of traditional medical apps, opting instead for an inviting, editorial atmosphere.

The style is a sophisticated blend of **Glassmorphism** and **Soft Minimalism**. It utilizes translucent layers to create a sense of breathability, paired with high-quality food photography that emphasizes texture and freshness. The emotional response is one of calm, clarity, and encouragement—making the act of nutrition tracking feel like a premium lifestyle choice rather than a chore.

## Colors
This design system employs a nature-inspired palette that alternates between freshness and warmth. 
- **Primary Green (#2F7D32):** Used for core branding, progress indicators, and "success" states.
- **Mint Base (#F3FAF3):** The standard background for activity and tracking screens to maintain a clean, energetic feel.
- **Cream Base (#FFF8ED):** Reserved for food-specific contexts, recipes, and meal planning to evoke appetite and kitchen warmth.
- **Orange Accent (#F28C28):** Used for highlights, CTA buttons, and energy-related metrics.
- **Tomato Red (#D94F30):** Strictly for warnings, deletions, or nutritional deficits.

Color transitions should be smooth; when moving from a "Tracking" tab to a "Recipe" tab, the background should subtly shift from Mint to Cream.

## Typography
The typography system balances the structural reliability of **Manrope** for navigation and data with the friendly, approachable rhythm of **Be Vietnam Pro** for long-form content.

Headlines should use tight letter-spacing to appear modern and "designed." For body text, generous line heights are utilized to ensure readability during active tasks like cooking or logging meals. Large display titles are used sparingly, primarily for daily summaries or morning greetings.

## Layout & Spacing
The layout follows a **Fluid Grid** model optimized for mobile-first interactions. It relies on a 4px baseline grid to ensure mathematical harmony.

- **Margins:** A standard 24px horizontal margin provides a premium, spacious feel.
- **Grouping:** Use 16px gaps between related cards and 32px between distinct content sections.
- **Safe Areas:** Elements should never touch the edge of the screen; the design system treats the screen boundary as a frame for the content.
- **Horizontal Scrollers:** Used frequently for food logs and recipe categories to keep the vertical scroll length manageable.

## Elevation & Depth
Depth is achieved through **Tonal Layering** and **Glassmorphism** rather than traditional heavy shadows.

1.  **The Base:** Either Mint or Cream solid background.
2.  **The Container:** White or highly-translucent (80% opacity) surfaces with a `24px` backdrop blur.
3.  **The Shadow:** "Ambient Glow" shadows—low opacity (8%), wide spread (20px), and tinted with the primary green or orange to prevent a "dirty" gray look.
4.  **The Interaction:** When pressed, elements should visually "sink" by reducing shadow spread and slightly decreasing opacity.

## Shapes
The shape language is defined by **High Circularity**. Large corner radii (20px-24px) are the signature of this design system, creating a soft, organic look that feels safe and human.

- **Cards:** Always use 24px radius.
- **Buttons & Inputs:** Use 20px radius.
- **Nested Elements:** Use "Inner Radius" (12px) for items inside a card to maintain visual nesting logic (Inner = Outer - Padding).

## Components
- **Buttons:** Primary buttons use a solid Green (#2F7D32) with white text. Secondary buttons utilize the glass effect: a semi-transparent white background with a thin 1px green border.
- **Glass Cards:** Used for the main dashboard metrics. They feature a subtle white-to-transparent gradient and a 1px inner white stroke to simulate light catching the edge of the glass.
- **Progress Rings:** For calorie and nutrient tracking, use thick, rounded strokes (12px width) with soft terminal ends.
- **Input Fields:** Soft-filled (Mint or Cream depending on context) with no border unless focused. Upon focus, a 2px Primary Green border appears.
- **Chips:** Highly rounded (pill-shaped) with low-contrast backgrounds (e.g., 10% opacity of the category color).
- **Food Display:** Food images should always have a 24px radius and include a subtle bottom-up gradient overlay to ensure white typography remains legible over the image.