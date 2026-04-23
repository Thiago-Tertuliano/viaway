# Design System Specification: The Curated Expedition

## 1. Overview & Creative North Star
This design system is built to move beyond the utilitarian "utility app" aesthetic and toward a high-end editorial experience. We are not just building a travel planner; we are building a digital concierge.

**Creative North Star: "The Curated Expedition"**
The system rejects the rigid, boxy constraints of traditional mobile apps in favor of an editorial layout that feels both authoritative and airy. By leveraging intentional asymmetry, sophisticated tonal layering, and "Glassmorphism," we create a workspace that reduces cognitive load and inspires trust through precision. The goal is to make the user feel like they are flipping through a premium travel journal that magically updates in real-time.

---

## 2. Color Philosophy & Tonal Depth
We utilize a palette that balances the stability of deep blues with the organic warmth of earth tones.

### The "No-Line" Rule
**Borders are prohibited for sectioning.** To achieve a high-end feel, boundaries must be defined exclusively through background color shifts or whitespace. 
*   **Implementation:** A section containing flight details (`surface-container-low`) should sit directly on the main page (`surface`) without a stroke. The eye should perceive the change in depth via the shift from `#faf8ff` to `#f3f3fe`.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical layers. 
*   **Level 0 (Base):** `surface` (#faf8ff) - The canvas.
*   **Level 1 (Sections):** `surface-container-low` (#f3f3fe) - For grouping related content areas.
*   **Level 2 (Interactive Cards):** `surface-container-lowest` (#ffffff) - Placed on top of Level 1 to create a "lifted" effect.
*   **Level 3 (High Prominence):** `surface-container-high` (#e7e7f3) - For recessed areas like search bars or inactive states.

### The "Glass & Gradient" Rule
Flat colors can feel "template-like." To add visual soul:
*   **Signature Gradients:** Use a subtle linear gradient from `primary` (#004ac6) to `primary_container` (#2563eb) for hero CTAs. This creates a "vibrant stability" that flat hex codes lack.
*   **Glassmorphism:** For floating navigation bars or overlays, use `surface` at 80% opacity with a `20px` backdrop-blur. This allows the vibrant colors of travel imagery to bleed through, maintaining a sense of place.

---

## 3. Typography: Editorial Authority
The typography system uses a pairing of **Plus Jakarta Sans** for character and **Inter** for precision.

*   **The Hero (Plus Jakarta Sans):** Used for all `display` and `headline` tokens. Its wider stance and modern curves provide a premium, "travel-magazine" feel. 
    *   *Intent:* Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) for aspirational headlines.
*   **The Workhorse (Inter):** Used for `title`, `body`, and `label` tokens. Inter’s high x-height ensures legibility during stressful travel moments (e.g., checking a gate number).
    *   *Intent:* Use `body-md` (0.875rem) with an increased line-height (1.6) to provide "airy" readability.

---

## 4. Elevation & Depth
We eschew traditional "drop shadows" in favor of **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by "stacking." A white card (`surface-container-lowest`) on a light lavender-grey background (`surface-container-low`) creates a natural, soft lift.
*   **Ambient Shadows:** If a floating element (like a FAB) requires a shadow, it must be "Ambient." Use the `on-surface` color (#191b23) at 4-6% opacity with a blur radius of at least `24px`. Never use pure black shadows.
*   **The Ghost Border:** If a boundary is legally or functionally required for accessibility, use the `outline-variant` (#c3c6d7) at **15% opacity**. This creates a "suggestion" of a container without breaking the editorial flow.

---

## 5. Component Guidelines

### Buttons: The Tactile Touchpoints
*   **Primary:** Pill-shaped (`rounded-full`). Background: `primary` to `primary_container` gradient. Text: `on-primary` (#ffffff).
*   **Secondary:** `surface-container-highest` background with `on-primary-fixed-variant` text. No border.
*   **Interaction:** On tap, the button should scale down slightly (98%) rather than just changing color, providing a premium tactile feel.

### Cards: The Content Vessels
*   **Rule:** Forbid divider lines within cards.
*   **Structure:** Use `title-md` for the destination name and `body-sm` for dates. Separate them using `12px` of vertical whitespace. 
*   **Visuals:** Image containers within cards should use the `lg` (1rem) corner radius to feel soft and approachable.

### Inputs: Stress-Free Utility
*   **Styling:** Use `surface-container-low` as the fill color. 
*   **State:** When focused, do not use a heavy border. Instead, shift the background to `surface-container-lowest` and add a "Ghost Border" of `primary` at 20% opacity.
*   **Labels:** Use `label-md` in `on-surface-variant` (#434655).

### Specialized Travel Components
*   **The Itinerary Timeline:** Do not use a solid vertical line. Use a series of `surface-variant` dots and whitespace to guide the eye.
*   **The Budget Chip:** Use `secondary_container` (#ebdec6) with `on-secondary-container` (#6a624f) text. The earthy sand tone provides a sophisticated contrast to the primary travel-blue, signifying "grounded" financial info.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Allow images to bleed off the edge of the grid or overlap slightly with text containers to create depth.
*   **Prioritize Breathing Room:** If you think there is enough whitespace, add 20% more. This system reflects a "stress-free" promise.
*   **Use High-Contrast Typography:** Pair a massive `display-sm` headline with a very small, uppercase `label-md` for a sophisticated, high-end hierarchy.

### Don’t:
*   **Don't use 1px solid dividers:** Use background color shifts or 24px+ gaps instead.
*   **Don't use pure black:** Use `on-surface` (#191b23) for all "black" text to keep the palette feeling organic.
*   **Don't use "Standard" Blue:** Avoid default browser or system blues. Stick strictly to the "North Star Blue" (`primary`: #004ac6).
*   **Don't over-round:** Use the `md` (0.75rem) or `lg` (1rem) radius for most containers. Reserve `full` only for buttons and chips to maintain a "sleek" rather than "bubbly" look.