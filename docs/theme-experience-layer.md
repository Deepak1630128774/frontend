# Theme Experience Layer

## Purpose

The theme system is now treated as a UI Experience Layer on top of the application. Every theme preserves identical modules, routes, actions, datasets, labels, and business logic while shifting four dimensions of presentation:

- Layout composition
- Background environment
- Motion language
- Component surface styling

This keeps product behavior stable while giving users materially different dashboard environments.

## Architecture Summary

Theme profiles are defined in `src/lib/theme-system.ts` and drive:

- Shell width and spacing density
- Navigation mode: sidebar, hybrid, or topbar
- Dashboard composition profile
- Motion preset and timing
- Background environment mood and imagery direction
- Surface radius and widget depth

The provider applies these profiles globally through root data attributes and CSS variables. The shell, shared widgets, and dashboard then consume those variables instead of hard-coded visual assumptions.

## UX Wireframes

### Default

Balanced SaaS dashboard with persistent sidebar and contextual right rail.

```text
+---------------- Sidebar ----------------+ +---------------- Main Header ----------------+
| Brand / pulse / nav                     | | Search / theme / user                       |
| Dashboard                               | +---------------------------------------------+
| CO2                                     | | Hero banner                                 |
| Fuel & Energy                           | +----------------+----------------------------+
| MACC                                    | | KPI strip      | KPI strip                  |
| Strategy                                | +----------------+----------------------------+
| Admin / Profile                         | | Main chart area             | Context rail   |
+-----------------------------------------+ | Secondary charts            | Theme insights |
                                            +---------------------------------------------+
```

### Spring

Open hybrid layout with more whitespace and softer visual boundaries.

```text
+----------- Compact Sidebar -----------+ +---------------- Header + Nav chips ---------+
| Brand / pulse / sections              | | Title / search / controls                   |
| Core navigation                       | +---------------------------------------------+
+---------------------------------------+ | Hero intro        | Three spacious stat cards|
                                          +-------------------+-------------------------+
                                          | KPI cards with more breathing room          |
                                          | Wide chart pair / lighter right rail        |
                                          +---------------------------------------------+
```

### Summer

Topbar-first spotlight layout that foregrounds action and headline metrics.

```text
+-------------------------- Header ---------------------------+
| Title / search / controls / user                          |
+---------------------- Nav Chip Bar ------------------------+
| Dashboard | CO2 | Fuel | MACC | Strategy | Profile         |
+------------------------------------------------------------+
| Centered hero banner with immediate status                 |
| KPI strip spanning full width                              |
| Large primary chart                    | compact sector view|
| Large secondary chart                  | quick action panel |
+------------------------------------------------------------+
```

### Autumn

Structured analytical layout with grouped reporting surfaces.

```text
+----------- Sidebar -----------+ +------------- Header / Nav -------------+
| Governance and modules        | | Section title / search / theme         |
+-------------------------------+ +----------------------------------------+
                                  | Intro summary | grouped stat cards      |
                                  +----------------------------------------+
                                  | Comparison block                        |
                                  | Main analytical chart | sector analysis |
                                  | Energy timeline       | pipeline review |
                                  +----------------------------------------+
```

### Winter

Minimal precision layout with tighter density and reduced decoration.

```text
+--------- Slim Sidebar --------+ +-------------- Compact Header ----------+
| concise nav                   | | title / controls                        |
+------------------------------+ +----------------------------------------+
                                 | concise hero                             |
                                 | compact KPIs                             |
                                 | 2-up chart grid                          |
                                 | 2-up lower analytical grid               |
                                 | comparison summary                       |
                                 +----------------------------------------+
```

### Midnight

Command-center layout with centralized metrics and glow-based focus.

```text
+-------------------------- Header ---------------------------+
| Title / controls / alerts                                  |
+--------------------- Command Nav Bar -----------------------+
| Dashboard | CO2 | Fuel | MACC | Strategy | Profile         |
+------------------------------------------------------------+
| Hero / ops message              | live status cards         |
| KPI strip across main stage                                  |
| Sector view | Primary trajectory chart                       |
| Energy mix  | Pipeline and governance rail                   |
+------------------------------------------------------------+
```

### Light Executive

Executive reporting layout tuned for briefing and presentation.

```text
+-------------------------- Header ---------------------------+
| Page title / controls / user                               |
+---------------------- Boardroom Nav ------------------------+
| Dashboard | CO2 | Fuel | MACC | Strategy | Profile         |
+------------------------------------------------------------+
| Hero intro / summary narrative | stacked executive highlights|
| KPI strip                                              rail |
| Comparison block                                         |
| Main report chart                  | sector summary       |
| Energy trend                       | pipeline brief       |
+------------------------------------------------------------+
```

## Moodboards And Visual Direction

### Default

- Reference mood: museum exhibit meets enterprise operations center
- Keywords: cinematic, brass highlights, layered glass, teal depth
- Recommended imagery: architectural gradients and low-contrast light cones

### Spring

- Reference mood: botanical conservatory dashboard
- Keywords: misted glass, fresh greens, daylight haze, soft bloom
- Recommended imagery: translucent leaf forms, dew-like gradients, pale atmosphere

### Summer

- Reference mood: coastal solar analytics studio
- Keywords: sunlit, kinetic, energetic, clear sky contrast
- Recommended imagery: horizon bands, warm flare accents, bright cyan transitions

### Autumn

- Reference mood: editorial analytics room
- Keywords: cedar, copper, paper grain, measured warmth
- Recommended imagery: subtle paper textures, horizontal banding, amber shadows

### Winter

- Reference mood: precision lab
- Keywords: arctic clarity, frosted glass, restraint, signal sharpness
- Recommended imagery: cold gradients, diffused frost patterns, minimal geometry

### Midnight

- Reference mood: night operations command center
- Keywords: neon trace, dark horizon, focused glow, observatory
- Recommended imagery: luminous signal arcs, dark radial glows, digital haze

### Light Executive

- Reference mood: boardroom report suite
- Keywords: ivory, brass, slate, editorial calm
- Recommended imagery: paper textures, presentation mats, subtle framed lighting

## Animation Guidelines

Global rules:

- Animate opacity, transform, and filter before heavier properties.
- Respect reduced motion preferences.
- Keep transitions under 650ms.
- Use ambient background motion only on large blurred layers.
- Component hover motion must remain optional and low amplitude.

Per-theme motion language:

- Default: cinematic ease with medium rise-in and soft depth changes
- Spring: organic drift and bloom-like stagger
- Summer: quick, energetic lifts and brighter emphasis transitions
- Autumn: calm, editorial fades with low-frequency movement
- Winter: short, precise motion with minimal overshoot
- Midnight: glow pulses and centralized focus halos
- Light Executive: almost static, limited to crisp fades and subtle elevation

## Background Imagery Style Guide

Background layers:

- Layer 1: base gradient or tonal field
- Layer 2: decorative imagery or abstract environmental form
- Layer 3: animated overlay, grid, or shimmer

Rules:

- Keep background contrast below content panel contrast.
- Use imagery as atmosphere, never as a competing focal point.
- Avoid sharp edges behind tables or charts.
- Prefer CSS gradients and vector-like forms first for performance.
- If using bitmap assets later, export in modern compressed formats and lazy load them.

Image directions:

- Default: abstract architecture or museum-light composition
- Spring: translucent botanical blur, no literal photography in dense areas
- Summer: horizon or solar-inspired abstractions with bright but soft contrast
- Autumn: paper, wood, or copper-inspired subtle textures
- Winter: ice-glass abstraction, extremely low-noise details
- Midnight: dark atmospheric glow with sparse electric traces
- Light Executive: presentation texture, matte paper, subtle brass framing

## Performance Strategy

- Keep the primary experience layer CSS-driven by default.
- If image assets are introduced, lazy load them after initial route render.
- Reuse shared component structure so only composition and styling shift.
- Store theme preference once and apply at the root to avoid deep rerenders.
- Limit motion to a few background layers plus transform-based component feedback.

## UX Validation Checklist

- Confirm every theme preserves the same navigation destinations and actions.
- Verify contrast on cards, data labels, and chart axes in both light and dark modes.
- Test mobile at compact widths for header overflow and nav chip wrapping.
- Validate keyboard navigation for the selector and all major shell actions.
- Confirm reduced motion still yields a coherent, high-quality experience.
- Review dashboard scan path and card density per theme with real stakeholder workflows.