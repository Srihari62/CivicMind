---
name: CivicMind
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434654'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#747685'
  outline-variant: '#c4c5d6'
  surface-tint: '#2854cc'
  primary: '#214fc7'
  on-primary: '#ffffff'
  primary-container: '#4169e1'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#b6c4ff'
  secondary: '#006a6a'
  on-secondary: '#ffffff'
  secondary-container: '#90efef'
  on-secondary-container: '#006e6e'
  tertiary: '#8900d3'
  on-tertiary: '#ffffff'
  tertiary-container: '#a72cf7'
  on-tertiary-container: '#fff5fe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#003baf'
  secondary-fixed: '#93f2f2'
  secondary-fixed-dim: '#76d6d5'
  on-secondary-fixed: '#002020'
  on-secondary-fixed-variant: '#004f4f'
  tertiary-fixed: '#f3daff'
  tertiary-fixed-dim: '#e3b5ff'
  on-tertiary-fixed: '#2f004c'
  on-tertiary-fixed-variant: '#6e00ab'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  button:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 32px
  margin-mobile: 24px
  margin-desktop: 64px
  stack-sm: 16px
  stack-md: 32px
  stack-lg: 64px
---

## Brand & Style
The design system establishes a visionary aesthetic for modern governance, moving away from bureaucratic rigidity toward a "Human-Centric Digital Infrastructure." The brand personality is optimistic, transparent, and approachable, yet profoundly high-tech.

The visual style is a hybrid of **Claymorphism** and **Glassmorphism**. It utilizes soft, voluminous 3D forms that feel tactile and friendly, layered over sophisticated frosted-glass surfaces. This combination evokes a sense of depth and multi-dimensional data, suggesting that government services are not just flat forms, but living, breathing systems. The UI should feel "inflated" and soft, using deep, diffused shadows to create a sense of weightlessness and approachability.

## Colors
The palette is built on a foundation of "Trust Blue" and "Vitality Green." 

- **Primary:** Royal Blue (#4169E1) serves as the anchor for authority. Electric Blue (#7DF9FF) and Sky Blue (#87CEEB) are used for inner glows and highlights to achieve the claymorphic effect.
- **Secondary:** Teal (#008080) and Emerald (#50C878) represent growth and environmental sustainability.
- **Backgrounds:** The base layer is a soft off-white (#F8FAFC). Overlays utilize a frosted glass effect with a high background blur (20px-40px) to maintain legibility while preserving the sense of depth.
- **Accents:** Purple and Coral are reserved for high-importance notifications and interactive call-to-actions that require immediate attention.

## Typography
The typography system prioritizes legibility and impact. We use **Inter** for its clean, geometric qualities and exceptional readability at all sizes.

- **Scale:** Headings are intentionally oversized to create a clear hierarchy and an editorial feel.
- **Spacing:** Generous line heights (1.6 for body) and wide letter spacing for labels ensure the UI feels airy and never cluttered.
- **Accessibility:** A strict "No Small Fonts" rule is enforced; the minimum font size for any functional text is 16px.
- **Hierarchy:** Display styles use heavy weights (800) with tight letter spacing to anchor sections, while body text remains light and breathable.

## Layout & Spacing
This design system uses a **Fluid Grid** model with expansive safe areas. 

- **The Floating Grid:** Content is housed in floating containers that do not necessarily touch the edges of the viewport.
- **Rhythm:** An 8px linear scale governs all spacing.
- **Desktop:** 12-column grid with wide 32px gutters and 64px outer margins to create a "contained" feel for the floating cards.
- **Mobile:** 4-column grid with 24px margins. Cards on mobile typically span the full width of the safe area but maintain the 24px-32px border radius.
- **Stacking:** Large vertical gaps (stack-lg) between major sections are required to maintain the "weightless" aesthetic.

## Elevation & Depth
Elevation is the core of the visual language. It is achieved through three primary techniques:

1.  **Claymorphic Shadows:** Use two layers of shadows. An inner light shadow (top-left, white/pale blue) and a deep, soft outer shadow (bottom-right, 15-20% opacity of the surface color). This creates the "inflated" 3D look.
2.  **Backdrop Blurs:** Glassmorphic elements use a `backdrop-filter: blur(30px)` combined with a thin, 1px semi-transparent white border to define the edge.
3.  **Z-Axis Hierarchy:**
    *   **Level 0:** Soft background with ambient, moving color blobs.
    *   **Level 1:** Frosted glass panels for sidebar/navigation.
    *   **Level 2:** Primary Claymorphic cards (Floating).
    *   **Level 3:** Interactive elements (Buttons, Dropdowns) which "pop" further on hover.

## Shapes
Shapes are extremely organic and soft. The default `rounded-xl` is 24px, and larger containers use 32px or 48px to reinforce the friendly, approachable nature of the platform.

- **Primary Cards:** 32px corner radius.
- **Buttons/Inputs:** Fully rounded (pill-shaped) to maximize the "clay" effect.
- **Consistency:** Avoid any sharp angles. Even progress bars and focus indicators must use a minimum of 8px radius.

## Components
- **Soft-3D Buttons:** These should feel "squishy." On hover, they should scale up slightly (1.05x) and the shadow depth should increase. On click (active), they should scale down (0.95x) and the inner shadow should invert to simulate a physical press.
- **Claymorphic Cards:** Floating containers with white backgrounds, featuring a subtle inner glow (#7DF9FF at 10% opacity) on the top-left edge.
- **Glassmorphic Dropdowns:** Use a high-blur background with a satin-like white stroke. Items should have a generous 12px padding.
- **Floating Navigation:** The main navigation bar should be a pill-shaped glass container floating at the top or bottom of the screen, decoupled from the window edges.
- **Micro-interactions:** All state changes must use spring-based physics (`stiffness: 300, damping: 20`). Background blobs should slowly drift and change color based on user scroll or mouse position.
- **Input Fields:** Recessed "inset" appearance using inner shadows to look like they are carved into the clay surface.