---
colors:
  surface: '#fcf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fcf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45464d'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#695d45'
  on-secondary: '#ffffff'
  secondary-container: '#efdebf'
  on-secondary-container: '#6e6149'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#f2e0c2'
  secondary-fixed-dim: '#d5c5a7'
  on-secondary-fixed: '#231a08'
  on-secondary-fixed-variant: '#51452f'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#fcf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
typography:
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  button:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  margin-mobile: 20px
  gutter-mobile: 12px
---

## Brand & Style

This design system is built on the philosophy of "Editorial Minimalism." It treats mobile screens like high-end travel journals—balancing generous whitespace with high-contrast elements to create a sense of calm authority. The UI evokes a feeling of reliability and discovery, moving away from cluttered utility toward a sophisticated, curated experience.

The visual language relies on a structured hierarchy, using the interplay between the deep navy and soft sand to establish a premium atmosphere. Subtle transitions and high-quality typography ensure that the information remains the hero, while the coral accent provides moments of energy and clear calls to action.

## Colors

The palette is anchored by **Deep Navy (#0F172A)**, used for primary interactions and heavy-weight typography to instill trust. **Sand (#E2D1B3)** acts as a sophisticated secondary tone, often used for container backgrounds or decorative elements to soften the high-contrast aesthetic. 

**Coral (#F47152)** is the singular accent color, reserved for high-priority actions and progress indicators. The background uses a crisp **Off-White (#F8FAFC)** to reduce eye strain and maintain the editorial feel. Surfaces and cards use pure white to pop against the background, ensuring clear separation of content.

## Typography

This design system utilizes a dual-font strategy. **Plus Jakarta Sans** provides a friendly yet modern character for headlines, using tight tracking and bold weights to command attention. **Inter** is used for all functional and body copy to ensure maximum legibility and a utilitarian balance to the expressive headers.

- **Headlines:** Use high-contrast sizing. H1 and H2 are always Deep Navy.
- **Body:** Maintain generous line heights for readability. Use 'body-sm' for secondary metadata.
- **Labels:** Small caps or uppercase with increased tracking are used for status chips and category markers to distinguish them from interactive text.

## Layout & Spacing

The layout follows a fluid-to-fixed model designed for mobile devices. A **4-column grid** is the standard, with **20px outer margins** to give the content "breathing room," reinforcing the premium editorial feel.

Spacing follows an 8pt rhythm. Small components (chips, icons) use 4px/8px increments, while larger sections (cards, headers) use 24px or 32px to create distinct groupings. Use "Negative Space" intentionally—do not feel the need to fill every corner of the screen.

## Elevation & Depth

This design system uses **Ambient Shadows** to create a sense of tactile layering without the harshness of traditional dropshadows. 

- **Level 0 (Base):** Background color #F8FAFC.
- **Level 1 (Cards):** White surfaces with a soft, diffused shadow: `0px 4px 20px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Floating/Interactive):** Active states or bottom navigation bars use a slightly tighter, darker shadow: `0px 8px 30px rgba(15, 23, 42, 0.1)`.

Avoid heavy borders; instead, use tonal shifts in the background or very subtle 1px strokes in Sand (#E2D1B3) to define boundaries.

## Shapes

The shape language is consistently rounded to evoke a sense of approachability and modern comfort.

- **Small (8px):** Used for input fields, buttons, and status chips.
- **Medium (12px):** Used for secondary cards and smaller image containers.
- **Large (16px):** Reserved for primary itinerary cards and bottom sheets.

Progress bars and toggle switches should always use "full-round" (pill-shaped) ends for a polished, functional look.

## Components

### Buttons
- **Primary:** Deep Navy background, White text. 16px padding (top/bottom).
- **Secondary:** Sand background, Deep Navy text.
- **Ghost:** No background, Deep Navy text with 1px Sand border.

### Cards & Progress
Cards are the primary vessel for travel data. They feature 16px rounding and Level 1 elevation. 
- **Progress Bars:** Thin 4px height. Track color is Sand, Fill color is Coral.
- **Status Chips:** Small caps text, 8px rounded corners. Use a 10% opacity fill of the status color (e.g., Success green) with full-opacity text.

### Inputs
Elegant input fields use a bottom-border only or a very light Sand outline. The focus state transitions to a 2px Deep Navy bottom border. Floating labels are preferred to maintain the clean aesthetic.

### Bottom Navigation
A persistent Level 2 elevated bar. Use Deep Navy for the active icon and Sand for inactive states. No labels are required if icons are universally recognizable, keeping the UI minimal.

### Itinerary Timeline
A vertical line in Sand (#E2D1B3) connecting Coral dots to indicate journey progress, emphasizing the "pathway" nature of the app.