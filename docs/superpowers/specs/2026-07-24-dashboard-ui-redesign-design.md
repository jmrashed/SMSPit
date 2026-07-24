# Dashboard UI/UX Redesign

Date: 2026-07-24

## Problem

`dashboard/` (React + Vite) is functionally complete through checklist Days 21-25 and 42-47, but its UI is a set of hand-styled, per-component plain CSS files with no shared design system. Specific gaps:

- No responsive strategy: the Inbox filter grid, message table, and nav bar are fixed layouts that break on small screens.
- Nav bar markup (title, org switcher, page links) is duplicated independently in every page component instead of a shared layout.
- No light/dark theming — the app is hardcoded dark.
- No consistent spacing/typography/color tokens across components.

This spec covers a visual and structural redesign of the whole dashboard: consistent design language, full responsiveness, and a light/dark toggle — without touching any backend/API contracts or `sms-service`/`auth-service`/`gateway`.

## Scope

**In scope**: `dashboard/` only (React app). All 6 routed pages (Inbox, Message Detail, Statistics, API Keys, Organizations, Compose) and their child components.

**Out of scope**: any other service, API contracts, WebSocket payloads, or new product features. This is a presentation-layer change only — component props/behavior/data flow stay the same, only markup and styling change (plus the new Layout/Theme wrapper, described below).

## Approach

### 1. Tailwind CSS migration

- Add Tailwind CSS v4 via its official Vite plugin (`@tailwindcss/vite`), zero-config PostCSS setup.
- `src/index.css` becomes: Tailwind's `@import "tailwind"` plus a small set of CSS custom properties for the handful of values that need to be theme-aware at runtime (see Theming below).
- Every existing per-component `.css` file is deleted as that component is migrated to Tailwind utility classes. No component keeps a hybrid of old CSS + Tailwind once migrated.
- `oxlint`/`tsc` config unaffected; no new lint rules needed for this change.

### 2. Shared Layout

- New `src/components/Layout.tsx` (+ no separate CSS file — Tailwind classes only) wrapping all routes in `App.tsx`: contains the top nav (title/logo, `OrgSwitcher`, page links: Inbox/Compose/Organizations/Statistics/API keys, `ThemeToggle`).
- Nav collapses to a hamburger-triggered drawer below the `md` breakpoint (768px). Each page component no longer renders its own nav — this duplicated markup is removed from all 6 pages as part of this change.
- `App.tsx` routes are wrapped once: `<Layout><Routes>...</Routes></Layout>`.

### 3. Theming (light/dark toggle)

- `src/context/ThemeContext.tsx`: on mount, reads `localStorage.theme`; if absent, falls back to `window.matchMedia('(prefers-color-scheme: dark)')`. Exposes `theme` and `toggleTheme()`.
- Applies/removes a `dark` class on `document.documentElement`; Tailwind config uses `darkMode: 'class'`.
- `src/components/ThemeToggle.tsx`: icon button in the nav, sun/moon icon, persists choice to `localStorage` on click.
- Dark remains the default when no OS preference / no stored choice is detected (matches current product identity). Light mode gets equal visual polish, not a stripped-down fallback.

### 4. Visual language (Tailwind theme tokens)

- Neutral surface scale: Tailwind's `slate`/`zinc` palette for backgrounds, borders, text at various elevations (page bg vs. card bg vs. hover).
- One accent color (purple, matching current brand use in links/primary buttons: `Compose`, `Export`, `Generate test data`) — reused across primary buttons, active nav links, focus rings.
- Status/semantic colors kept 1:1 with current meaning: Captured = green, OTP = blue, Spam = red, Transactional = neutral/gray. Only contrast/consistency improves, not the color-to-meaning mapping.
- Consistent spacing scale (Tailwind defaults), `rounded-lg` cards with subtle `border` instead of today's flat blocks, visible `focus-visible` ring on all interactive elements (buttons, inputs, links) for accessibility.

### 5. Responsive behavior (the main functional fix)

- **Nav**: full links row ≥`md`; hamburger + slide-over drawer <`md`.
- **Inbox filters** (`MessageFilters`): grid reflows 1 col (mobile) → 2 col (tablet) → current multi-column layout (desktop). On mobile, filters are collapsed by default behind a "Filters" disclosure toggle to avoid pushing the message list below the fold.
- **Message table** (`MessageList`): ≥`md` keeps a table; <`md` renders the same data as stacked cards (labeled To/From/Message/Status/Captured rows) instead of horizontal scroll.
- **Statistics page** (`StatCard` grid, `VolumeChart`): grid reflows 1 col → 2 col → 4 col by breakpoint; chart container is fluid-width.
- **Compose / API Keys / Organizations / Message Detail**: forms and detail panels go full-width on mobile, constrained max-width on desktop, no fixed pixel widths anywhere.

### 6. Components touched

`Layout` (new), `ThemeToggle` (new), `ThemeContext` (new), `OrgSwitcher`, `MessageFilters`, `MessageList`, `MessageListSkeleton`, `StatCard`, `VolumeChart`, `ClassificationBadge`, `OtpBadge`, `SpamBadge`, `StatusBadge`, `ExportButton`, `GenerateTestDataButton`, `TemplatePicker`, `Toast`, `ErrorBanner`, `Spinner`, and all 6 page components.

## Testing / Verification

No frontend test suite currently exists for `dashboard/` (confirmed — no `*.test.*` files). This change does not add one (out of scope — not requested, and this is a styling/markup change with no new logic branches to unit-test).

Verification is manual/visual, per this repo's `run`/`verify` conventions:
- `npm run dev`, then check each of the 6 pages in-browser at mobile (375px), tablet (768px), and desktop (1280px) widths.
- Toggle light/dark on at least 2 pages and confirm contrast/readability in both.
- `npm run build` must succeed (`tsc -b && vite build`) with no type errors.
- `npm run lint` (oxlint) must pass.

## Non-goals

- No new features, no API/behavior changes.
- No component library (Radix, etc.) — plain Tailwind utilities only, per the chosen approach.
- No test suite scaffolding for the dashboard as part of this change.
