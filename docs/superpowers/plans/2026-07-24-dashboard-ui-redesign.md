# Dashboard UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `dashboard/` from hand-rolled per-component CSS to Tailwind CSS with a shared responsive Layout/nav and a light/dark theme toggle, across all 6 pages.

**Architecture:** Add Tailwind CSS v4 (Vite plugin, class-based dark mode). Introduce a `ThemeContext`/`ThemeToggle` and a shared `Layout` component that owns the nav (desktop row / mobile drawer) so it stops being duplicated per page. Migrate each page and its child components from `.css` files to Tailwind utility classes, page-group by page-group, deleting the old `.css` file the moment its component is migrated.

**Tech Stack:** React 19, Vite 8, TypeScript, `tailwindcss` v4 + `@tailwindcss/vite`, `react-router-dom` v7 (all already in place except Tailwind).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-24-dashboard-ui-redesign-design.md`
- No new features, no API/behavior changes — component props, state, and data flow stay identical; only markup/styling change.
- Dark mode is the default when no stored preference / OS preference is found; light mode gets equal polish, not a stripped-down fallback.
- Dark mode strategy: class-based (`dark` class on `<html>`), not `prefers-color-scheme` media query, so the toggle works independently of OS setting. Tailwind v4 custom variant: `@custom-variant dark (&:where(.dark, .dark *));`.
- Accent color: Tailwind's `purple` palette (`purple-600` / `dark:purple-400`), matching the existing brand accent (`#aa3bff` light / `#c084fc` dark).
- Status/semantic colors keep their existing meaning: Captured = green, Failed = red, OTP = purple/violet, Spam = red, Transactional/other categories = neutral gray/blue — only contrast improves, not the mapping.
- Breakpoints: Tailwind defaults — `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px. Nav collapses to a drawer below `md`. The Inbox message table becomes stacked cards below `md`.
- Every migrated component's `.css` file is deleted in the same task that migrates it — no component keeps a hybrid of old CSS + Tailwind once migrated.
- Preserve all existing `data-testid`, `role`, and `aria-*` attributes verbatim — no dashboard test suite exists today, but these are behavioral contracts other tooling (Playwright verification, future tests) may rely on.
- The standalone "← Back to inbox" links on Message Detail / Compose / Statistics / API Keys / Organizations pages are removed — the new global `Layout` nav (with an Inbox link) supersedes them; keeping both is redundant duplicate navigation.
- No unit/integration test suite is added (spec non-goal — none exists today for `dashboard/`). Verification is: `npm run build` (must succeed, no type errors), `npm run lint` (oxlint, must pass), and manual visual check via `npm run dev` at 375px / 768px / 1280px widths plus a light/dark toggle check.
- No `checklist.md` item maps to this redesign (confirmed via grep — no matching line); do not modify `checklist.md` as part of this plan.

---

### Task 1: Install and configure Tailwind CSS v4

**Files:**
- Modify: `dashboard/package.json` (add deps)
- Modify: `dashboard/vite.config.ts`
- Modify: `dashboard/src/index.css`

**Interfaces:**
- Produces: Tailwind utility classes available in every `.tsx` file via `className`; `dark:` variant keyed off a `.dark` class on `<html>` (not OS preference).

- [ ] **Step 1: Install Tailwind CSS v4 and the Vite plugin**

```bash
cd /mnt/200GB/Downloads/SMSPit/dashboard && npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Wire the Tailwind Vite plugin**

Modify `dashboard/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 3: Replace `index.css` with Tailwind import + class-based dark mode + base typography**

Replace the full contents of `dashboard/src/index.css`:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  html {
    color-scheme: light dark;
  }

  body {
    margin: 0;
    font-family: system-ui, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  #root {
    width: 100%;
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  code {
    font-family: ui-monospace, Consolas, monospace;
  }
}
```

- [ ] **Step 4: Verify the build succeeds**

Run: `cd /mnt/200GB/Downloads/SMSPit/dashboard && npm run build`
Expected: build completes with no errors (existing components still reference now-deleted-later CSS files at this point, which is fine — nothing is deleted yet).

- [ ] **Step 5: Verify Tailwind is live in the browser**

Run: `cd /mnt/200GB/Downloads/SMSPit/dashboard && npm run dev` (background), open `http://127.0.0.1:5173/`.
Expected: page still renders (old CSS untouched), no console errors about Tailwind/PostCSS.

- [ ] **Step 6: Commit**

```bash
cd /mnt/200GB/Downloads/SMSPit/dashboard && git add package.json package-lock.json vite.config.ts src/index.css && git commit -m "Add Tailwind CSS v4 with class-based dark mode"
```

---

### Task 2: Theme context and toggle

**Files:**
- Create: `dashboard/src/context/ThemeContext.tsx`
- Create: `dashboard/src/components/ThemeToggle.tsx`
- Modify: `dashboard/src/main.tsx`

**Interfaces:**
- Produces: `ThemeProvider` (wraps the app), `useTheme(): { theme: 'light' | 'dark'; toggleTheme: () => void }`, `<ThemeToggle />` component (no props) for use in `Layout` (Task 3).

- [ ] **Step 1: Create `ThemeContext`**

Create `dashboard/src/context/ThemeContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'smspit-theme';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

Note: default is dark unless the OS explicitly prefers light and there's no stored choice — satisfies "dark is the default" from Global Constraints.

- [ ] **Step 2: Create `ThemeToggle`**

Create `dashboard/src/components/ThemeToggle.tsx`:

```tsx
import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm9-6a1 1 0 010 2h-1a1 1 0 110-2h1zM4 12a1 1 0 010 2H3a1 1 0 110-2h1zm14.36-6.36a1 1 0 011.42 1.42l-.71.7a1 1 0 11-1.41-1.41l.7-.71zM6.34 17.66a1 1 0 011.41 1.41l-.7.71a1 1 0 11-1.42-1.42l.71-.7zM18.36 18.36a1 1 0 01-1.42 0l-.7-.71a1 1 0 111.41-1.41l.71.7a1 1 0 010 1.42zM5.64 5.64a1 1 0 010 1.42l-.7.7A1 1 0 113.5 6.35l.71-.71a1 1 0 011.42 0zM12 20a1 1 0 011 1v-1a1 1 0 10-2 0v1a1 1 0 011-1z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M20.354 15.354A9 9 0 018.646 3.646a9.003 9.003 0 1011.708 11.708z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 3: Wrap the app in `ThemeProvider`**

Modify `dashboard/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
```

- [ ] **Step 4: Verify in browser**

Run `npm run dev`, open the app, open devtools console, run `document.documentElement.classList` — expect it to contain `dark` (or not, depending on OS preference) and `localStorage.getItem('smspit-theme')` to return `'dark'` or `'light'`. `<ThemeToggle />` isn't rendered anywhere yet (that's Task 3) so no visible UI change this step — this is a plumbing check only.

- [ ] **Step 5: Commit**

```bash
cd /mnt/200GB/Downloads/SMSPit/dashboard && git add src/context/ThemeContext.tsx src/components/ThemeToggle.tsx src/main.tsx && git commit -m "Add theme context and toggle for light/dark mode"
```

---

### Task 3: Shared responsive Layout with nav

**Files:**
- Create: `dashboard/src/components/Layout.tsx`
- Modify: `dashboard/src/App.tsx`

**Interfaces:**
- Consumes: `useTheme()` is not needed directly here (only `<ThemeToggle />`); `<OrgSwitcher />` from `dashboard/src/components/OrgSwitcher.tsx` (still on old CSS until Task 4 — that's fine, it renders as-is inside the new nav).
- Produces: `<Layout>{children}</Layout>` wrapping all routes; nav links to `/`, `/compose`, `/organizations`, `/statistics`, `/api-keys`.

- [ ] **Step 1: Create `Layout`**

Create `dashboard/src/components/Layout.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { OrgSwitcher } from './OrgSwitcher';
import { ThemeToggle } from './ThemeToggle';

const NAV_LINKS = [
  { to: '/', label: 'Inbox', end: true },
  { to: '/compose', label: 'Compose', end: false },
  { to: '/organizations', label: 'Organizations', end: false },
  { to: '/statistics', label: 'Statistics', end: false },
  { to: '/api-keys', label: 'API keys', end: false },
];

function navLinkClasses(isActive: boolean): string {
  return [
    'rounded-md px-3 py-2 text-sm font-medium',
    isActive
      ? 'text-purple-600 dark:text-purple-400'
      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
  ].join(' ');
}

export function Layout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-svh flex-col bg-white text-slate-700 dark:bg-slate-950 dark:text-slate-300">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-lg font-semibold text-slate-900 dark:text-white">SMSPit</span>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <OrgSwitcher />
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setDrawerOpen((open) => !open)}
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={drawerOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                {drawerOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {drawerOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 md:hidden dark:border-slate-800">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                {link.label}
              </NavLink>
            ))}
            <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800">
              <OrgSwitcher />
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Wire `Layout` into `App.tsx`, wrapping all routes**

Modify `dashboard/src/App.tsx`:

```tsx
import { Route, Routes } from 'react-router-dom';
import { InboxPage } from './pages/InboxPage';
import { MessageDetailPage } from './pages/MessageDetailPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { ComposePage } from './pages/ComposePage';
import { ToastProvider } from './components/Toast';
import { OrgProvider } from './context/OrgContext';
import { Layout } from './components/Layout';

function App() {
  return (
    <ToastProvider>
      <OrgProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<InboxPage />} />
            <Route path="/messages/:id" element={<MessageDetailPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/api-keys" element={<ApiKeysPage />} />
            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/compose" element={<ComposePage />} />
          </Routes>
        </Layout>
      </OrgProvider>
    </ToastProvider>
  );
}

export default App;
```

- [ ] **Step 3: Verify in browser at 3 widths**

Run `npm run dev`, open `http://127.0.0.1:5173/`.
Expected at 1280px: full nav row visible (Inbox/Compose/Organizations/Statistics/API keys), org switcher + theme toggle on the right, page now has two navs temporarily (Layout's new nav plus InboxPage's old nav-links row — the old one is removed in Task 4).
Expected at 375px: nav row hidden, hamburger button visible; clicking it opens/closes a drawer with the same links stacked.
Expected: clicking the theme toggle flips the page between light and dark backgrounds immediately.

- [ ] **Step 4: Commit**

```bash
cd /mnt/200GB/Downloads/SMSPit/dashboard && git add src/components/Layout.tsx src/App.tsx && git commit -m "Add shared responsive Layout with nav, drawer, and theme toggle"
```

---

### Task 4: Migrate Inbox page and its components

**Files:**
- Modify: `dashboard/src/pages/InboxPage.tsx`; Delete: `dashboard/src/pages/InboxPage.css`
- Modify: `dashboard/src/components/MessageFilters.tsx`; Delete: `dashboard/src/components/MessageFilters.css`
- Modify: `dashboard/src/components/MessageList.tsx`; Delete: `dashboard/src/components/MessageList.css`
- Modify: `dashboard/src/components/MessageListSkeleton.tsx`; Delete: `dashboard/src/components/MessageListSkeleton.css`
- Modify: `dashboard/src/components/StatusBadge.tsx`; Delete: `dashboard/src/components/StatusBadge.css`
- Modify: `dashboard/src/components/OtpBadge.tsx`; Delete: `dashboard/src/components/OtpBadge.css`
- Modify: `dashboard/src/components/ClassificationBadge.tsx`; Delete: `dashboard/src/components/ClassificationBadge.css`
- Modify: `dashboard/src/components/SpamBadge.tsx`; Delete: `dashboard/src/components/SpamBadge.css`
- Modify: `dashboard/src/components/ExportButton.tsx`; Delete: `dashboard/src/components/ExportButton.css`
- Modify: `dashboard/src/components/GenerateTestDataButton.tsx`; Delete: `dashboard/src/components/GenerateTestDataButton.css`
- Modify: `dashboard/src/components/ErrorBanner.tsx`; Delete: `dashboard/src/components/ErrorBanner.css`
- Modify: `dashboard/src/components/OrgSwitcher.tsx`; Delete: `dashboard/src/components/OrgSwitcher.css`

**Interfaces:**
- Consumes: `Layout` (Task 3) already renders the global nav — `InboxPage` no longer renders its own nav-links row.
- Produces: unchanged component signatures (`MessageFilters({ filters, onChange })`, `MessageList({ messages })`, `MessageListSkeleton({ rows })`, `StatusBadge({ status })`, `OtpBadge()`, `ClassificationBadge({ category })`, `SpamBadge()`, `ExportButton({ filters })`, `GenerateTestDataButton()`, `ErrorBanner({ message, onRetry })`, `OrgSwitcher()`) — only JSX/className bodies change.

- [ ] **Step 1: Migrate badge components**

Replace `dashboard/src/components/StatusBadge.tsx`:

```tsx
import type { MessageStatus } from '../types/message';

const LABELS: Record<MessageStatus, string> = {
  captured: 'Captured',
  failed: 'Failed',
};

const TONE: Record<MessageStatus, string> = {
  captured: 'text-green-700 bg-green-600/10 dark:text-green-400 dark:bg-green-400/15',
  failed: 'text-red-700 bg-red-600/10 dark:text-red-400 dark:bg-red-400/15',
};

export function StatusBadge({ status }: { status: MessageStatus }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {LABELS[status]}
    </span>
  );
}
```

Delete `dashboard/src/components/StatusBadge.css`.

Replace `dashboard/src/components/OtpBadge.tsx`:

```tsx
export function OtpBadge() {
  return (
    <span
      title="An OTP was detected in this message"
      className="inline-flex items-center whitespace-nowrap rounded-full bg-purple-600/10 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-400/15 dark:text-purple-300"
    >
      OTP
    </span>
  );
}
```

Delete `dashboard/src/components/OtpBadge.css`.

Replace `dashboard/src/components/SpamBadge.tsx`:

```tsx
export function SpamBadge() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-red-600/10 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-400/15 dark:text-red-300">
      Spam
    </span>
  );
}
```

Delete `dashboard/src/components/SpamBadge.css`.

Replace `dashboard/src/components/ClassificationBadge.tsx`:

```tsx
import type { MessageCategory } from '../types/message';

const LABELS: Record<MessageCategory, string> = {
  otp: 'OTP',
  transactional: 'Transactional',
  marketing: 'Marketing',
  other: 'Other',
};

const TONE: Record<MessageCategory, string> = {
  otp: '',
  transactional: 'text-blue-700 bg-blue-600/10 dark:text-blue-300 dark:bg-blue-400/15',
  marketing: 'text-amber-700 bg-amber-600/10 dark:text-amber-300 dark:bg-amber-400/15',
  other: 'text-slate-700 bg-slate-500/10 dark:text-slate-300 dark:bg-slate-400/15',
};

// The 'otp' category is already surfaced by OtpBadge -- showing both here
// would just repeat the same signal twice on one row.
export function ClassificationBadge({ category }: { category: MessageCategory }) {
  if (category === 'otp') {
    return null;
  }

  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[category]}`}>
      {LABELS[category]}
    </span>
  );
}
```

Delete `dashboard/src/components/ClassificationBadge.css`.

- [ ] **Step 2: Verify build after badges**

Run: `cd /mnt/200GB/Downloads/SMSPit/dashboard && npm run build`
Expected: fails referencing deleted `.css` imports still used elsewhere (`MessageList.tsx`, `MessageDetailPage.tsx` still import the old badges fine since only their internals changed, not their import paths) — actually expected to **succeed**, since only the 4 badge files' own CSS imports were removed and no other file imports those `.css` files directly.

- [ ] **Step 3: Migrate `MessageFilters`**

Replace `dashboard/src/components/MessageFilters.tsx`:

```tsx
import type { ChangeEvent } from 'react';
import type { MessageFilters as MessageFiltersState } from '../types/filters';

interface Props {
  filters: MessageFiltersState;
  onChange: (filters: MessageFiltersState) => void;
}

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All categories' },
  { value: 'otp', label: 'OTP' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

const SPAM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All messages' },
  { value: 'false', label: 'Hide spam' },
  { value: 'true', label: 'Spam only' },
];

const fieldClasses =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function MessageFilters({ filters, onChange }: Props) {
  const handleField =
    (field: keyof MessageFiltersState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ ...filters, [field]: event.target.value });
    };

  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      onSubmit={(e) => e.preventDefault()}
      role="search"
    >
      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>To</span>
        <input type="text" placeholder="+8801700000000" value={filters.to} onChange={handleField('to')} className={fieldClasses} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>From</span>
        <input type="text" placeholder="SMSPit" value={filters.from} onChange={handleField('from')} className={fieldClasses} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>Category</span>
        <select value={filters.category} onChange={handleField('category')} className={fieldClasses}>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>Spam</span>
        <select value={filters.isSpam} onChange={handleField('isSpam')} className={fieldClasses}>
          {SPAM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>From date</span>
        <input type="date" value={filters.createdAfter} onChange={handleField('createdAfter')} className={fieldClasses} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>To date</span>
        <input type="date" value={filters.createdBefore} onChange={handleField('createdBefore')} className={fieldClasses} />
      </label>
    </form>
  );
}
```

Delete `dashboard/src/components/MessageFilters.css`.

- [ ] **Step 4: Migrate `ExportButton` and `GenerateTestDataButton`**

Replace `dashboard/src/components/ExportButton.tsx`:

```tsx
import { useState } from 'react';
import { exportMessages, type ExportMessagesParams } from '../api/messages';
import { useToast } from './Toast';

// blob: URLs are how a browser-triggered download works for a response
// that required an Authorization header to fetch -- a plain <a href>
// can't attach one, so the file has to be fetched first and handed to
// the browser as an object URL.
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ExportButton({ filters }: { filters: Omit<ExportMessagesParams, 'format'> }) {
  const { showToast } = useToast();
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const { blob, filename } = await exportMessages({ ...filters, format });
      triggerDownload(blob, filename);
    } catch (err: unknown) {
      console.error('Failed to export messages', err);
      showToast('Failed to export messages.', 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={format}
        onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
        aria-label="Export format"
        disabled={exporting}
        className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        <option value="csv">CSV</option>
        <option value="json">JSON</option>
      </select>
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
      >
        {exporting ? 'Exporting…' : 'Export'}
      </button>
    </div>
  );
}
```

Delete `dashboard/src/components/ExportButton.css`.

Replace `dashboard/src/components/GenerateTestDataButton.tsx`:

```tsx
import { useState } from 'react';
import { generateTestData } from '../api/generate';
import { createMessage } from '../api/messages';
import { useToast } from './Toast';

// Capped well below ai-service's own limit (50) and gated behind a
// confirmation for anything past a handful -- this writes real rows via
// the same capture endpoint a live integration would use, so a fat-
// fingered count shouldn't be able to flood the inbox unnoticed.
const MAX_COUNT = 20;
const CONFIRM_THRESHOLD = 5;

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Random mix' },
  { value: 'otp', label: 'OTP' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

export function GenerateTestDataButton() {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(5);
  const [type, setType] = useState('');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (count > CONFIRM_THRESHOLD && !window.confirm(`Generate ${count} synthetic test messages into the inbox?`)) {
      return;
    }

    setGenerating(true);
    try {
      const { messages } = await generateTestData({ count, type: type || undefined });

      let created = 0;
      for (const generated of messages) {
        try {
          await createMessage({ to: generated.to, from: generated.from, message: generated.message });
          created++;
        } catch (err: unknown) {
          console.error('Failed to capture a generated test message', err);
        }
      }

      showToast(`Generated ${created} of ${messages.length} test message(s).`, created > 0 ? 'success' : 'error');
      setOpen(false);
    } catch (err: unknown) {
      console.error('Failed to generate test data', err);
      showToast('Failed to generate test data. Is ai-service running?', 'error');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-400"
      >
        Generate test data
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            Count (max {MAX_COUNT})
            <input
              type="number"
              min={1}
              max={MAX_COUNT}
              value={count}
              onChange={(e) => setCount(Math.min(MAX_COUNT, Math.max(1, Number(e.target.value) || 1)))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <label className="mt-3 flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Generated messages are captured into the inbox immediately.
          </p>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="mt-3 w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      )}
    </div>
  );
}
```

Delete `dashboard/src/components/GenerateTestDataButton.css`.

- [ ] **Step 5: Migrate `ErrorBanner` and `OrgSwitcher`**

Replace `dashboard/src/components/ErrorBanner.tsx`:

```tsx
export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      data-testid="error-banner"
      className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-red-300 px-3 py-1 font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/40"
      >
        Retry
      </button>
    </div>
  );
}
```

Delete `dashboard/src/components/ErrorBanner.css`.

Replace `dashboard/src/components/OrgSwitcher.tsx`:

```tsx
import { useOrg } from '../context/OrgContext';

export function OrgSwitcher() {
  const { organizations, loading, selectedOrgId, setSelectedOrgId } = useOrg();

  if (loading || organizations.length === 0) {
    return null;
  }

  return (
    <select
      aria-label="Organization"
      value={selectedOrgId ?? ''}
      onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : null)}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
```

Delete `dashboard/src/components/OrgSwitcher.css`.

- [ ] **Step 6: Migrate `MessageListSkeleton`**

Replace `dashboard/src/components/MessageListSkeleton.tsx`:

```tsx
export function MessageListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      data-testid="message-list-skeleton"
      aria-busy="true"
      aria-label="Loading messages"
      className="flex flex-col gap-3"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <span className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" />
          <span className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" />
          <span className="h-4 flex-1 rounded bg-slate-200 dark:bg-slate-800" />
          <span className="h-4 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
          <span className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}
```

Delete `dashboard/src/components/MessageListSkeleton.css`.

- [ ] **Step 7: Migrate `MessageList` — table on desktop, stacked cards below `md`**

Replace `dashboard/src/components/MessageList.tsx`:

```tsx
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Message } from '../types/message';
import { StatusBadge } from './StatusBadge';
import { OtpBadge } from './OtpBadge';
import { ClassificationBadge } from './ClassificationBadge';
import { SpamBadge } from './SpamBadge';

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function MessageList({ messages }: { messages: Message[] }) {
  const navigate = useNavigate();

  if (messages.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No messages captured yet.</p>;
  }

  const goToDetail = (id: string) => navigate(`/messages/${id}`);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      goToDetail(id);
    }
  };

  return (
    <>
      {/* Desktop/tablet: table */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th className="py-2 pr-4 font-medium">To</th>
            <th className="py-2 pr-4 font-medium">From</th>
            <th className="py-2 pr-4 font-medium">Message</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 font-medium">Captured</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((message) => (
            <tr
              key={message.id}
              data-testid="message-row"
              role="link"
              tabIndex={0}
              onClick={() => goToDetail(message.id)}
              onKeyDown={(event) => handleKeyDown(event, message.id)}
              className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 dark:border-slate-900 dark:hover:bg-slate-900"
            >
              <td className="py-3 pr-4 align-top">{message.to}</td>
              <td className="py-3 pr-4 align-top">{message.from}</td>
              <td className="max-w-xs truncate py-3 pr-4 align-top">{message.message}</td>
              <td className="py-3 pr-4 align-top">
                <div className="flex flex-wrap gap-1">
                  <StatusBadge status={message.status} />
                  {message.otp && <OtpBadge />}
                  {message.category && <ClassificationBadge category={message.category} />}
                  {message.is_spam && <SpamBadge />}
                </div>
              </td>
              <td className="py-3 align-top text-slate-500 dark:text-slate-400">{formatTimestamp(message.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {messages.map((message) => (
          <div
            key={message.id}
            data-testid="message-row"
            role="link"
            tabIndex={0}
            onClick={() => goToDetail(message.id)}
            onKeyDown={(event) => handleKeyDown(event, message.id)}
            className="cursor-pointer rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{message.to}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(message.created_at)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">From {message.from}</p>
            <p className="mt-2 line-clamp-2 text-slate-700 dark:text-slate-300">{message.message}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <StatusBadge status={message.status} />
              {message.otp && <OtpBadge />}
              {message.category && <ClassificationBadge category={message.category} />}
              {message.is_spam && <SpamBadge />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
```

Delete `dashboard/src/components/MessageList.css`.

- [ ] **Step 8: Migrate `InboxPage` — remove the old nav row, use `Layout`'s nav instead**

Replace `dashboard/src/pages/InboxPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { Message } from '../types/message';
import { listMessages } from '../api/messages';
import { MessageList } from '../components/MessageList';
import { MessageFilters } from '../components/MessageFilters';
import { MessageListSkeleton } from '../components/MessageListSkeleton';
import { ErrorBanner } from '../components/ErrorBanner';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useMessageSocket } from '../hooks/useMessageSocket';
import { ExportButton } from '../components/ExportButton';
import { GenerateTestDataButton } from '../components/GenerateTestDataButton';
import { EMPTY_FILTERS, type MessageFilters as MessageFiltersState } from '../types/filters';

// Date-only inputs mean "before end of day" should include the whole
// selected day, not just midnight.
function endOfDay(dateOnly: string): string {
  return `${dateOnly}T23:59:59.999Z`;
}

export function InboxPage() {
  const [filters, setFilters] = useState<MessageFiltersState>(EMPTY_FILTERS);
  const debouncedFilters = useDebouncedValue(filters, 300);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    listMessages({
      to: debouncedFilters.to,
      from: debouncedFilters.from,
      category: debouncedFilters.category || undefined,
      is_spam: debouncedFilters.isSpam ? debouncedFilters.isSpam === 'true' : undefined,
      created_after: debouncedFilters.createdAfter || undefined,
      created_before: debouncedFilters.createdBefore ? endOfDay(debouncedFilters.createdBefore) : undefined,
    })
      .then((response) => {
        if (cancelled) return;
        setMessages(response.messages);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load messages', err);
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedFilters, retryToken]);

  useMessageSocket(() => setRetryToken((t) => t + 1));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Inbox</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Messages captured by SMSPit instead of being delivered.
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <MessageFilters filters={filters} onChange={setFilters} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ExportButton
            filters={{
              to: debouncedFilters.to,
              from: debouncedFilters.from,
              created_after: debouncedFilters.createdAfter || undefined,
              created_before: debouncedFilters.createdBefore ? endOfDay(debouncedFilters.createdBefore) : undefined,
            }}
          />
          <GenerateTestDataButton />
        </div>
      </div>

      {error && (
        <ErrorBanner
          message="Couldn't load messages. Check that sms-service is running."
          onRetry={() => setRetryToken((t) => t + 1)}
        />
      )}
      {!error && (loading ? <MessageListSkeleton /> : <MessageList messages={messages} />)}
    </div>
  );
}
```

Delete `dashboard/src/pages/InboxPage.css`.

- [ ] **Step 9: Verify build and lint**

Run: `cd /mnt/200GB/Downloads/SMSPit/dashboard && npm run build && npm run lint`
Expected: both succeed with no errors.

- [ ] **Step 10: Manual visual check**

Run `npm run dev`, open `http://127.0.0.1:5173/`.
Expected at 1280px: single nav (from `Layout`), filters in a responsive grid, table with badges matching the original screenshot's semantics, Export/Generate test data buttons.
Expected at 375px: filters stack to 1 column, message list renders as stacked cards (no horizontal scroll), nav is a hamburger.
Expected: toggling theme keeps all text readable (no white-on-white or black-on-black).

- [ ] **Step 11: Commit**

```bash
cd /mnt/200GB/Downloads/SMSPit/dashboard && git add src/pages/InboxPage.tsx src/components/MessageFilters.tsx src/components/MessageList.tsx src/components/MessageListSkeleton.tsx src/components/StatusBadge.tsx src/components/OtpBadge.tsx src/components/ClassificationBadge.tsx src/components/SpamBadge.tsx src/components/ExportButton.tsx src/components/GenerateTestDataButton.tsx src/components/ErrorBanner.tsx src/components/OrgSwitcher.tsx && git add -u src/pages/InboxPage.css src/components/MessageFilters.css src/components/MessageList.css src/components/MessageListSkeleton.css src/components/StatusBadge.css src/components/OtpBadge.css src/components/ClassificationBadge.css src/components/SpamBadge.css src/components/ExportButton.css src/components/GenerateTestDataButton.css src/components/ErrorBanner.css src/components/OrgSwitcher.css && git commit -m "Migrate Inbox page and its components to Tailwind with responsive table/cards"
```

---

### Task 5: Migrate Message Detail page

**Files:**
- Modify: `dashboard/src/pages/MessageDetailPage.tsx`; Delete: `dashboard/src/pages/MessageDetailPage.css`
- Modify: `dashboard/src/components/Spinner.tsx`; Delete: `dashboard/src/components/Spinner.css`
- Modify: `dashboard/src/components/Toast.tsx`; Delete: `dashboard/src/components/Toast.css`

**Interfaces:**
- Consumes: `StatusBadge`, `ClassificationBadge`, `SpamBadge` (Task 4, unchanged signatures), `ErrorBanner` (Task 4).
- Produces: `Spinner({ label })`, `ToastProvider`/`useToast()` unchanged signatures.

- [ ] **Step 1: Migrate `Spinner`**

Replace `dashboard/src/components/Spinner.tsx`:

```tsx
export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 py-4 text-sm text-slate-500 dark:text-slate-400">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-purple-600 dark:border-slate-700 dark:border-t-purple-400"
      />
      <span>{label}</span>
    </div>
  );
}
```

Delete `dashboard/src/components/Spinner.css`.

- [ ] **Step 2: Migrate `Toast`**

Replace `dashboard/src/components/Toast.tsx`:

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error';

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

const TONE: Record<ToastKind, string> = {
  success: 'bg-green-600 dark:bg-green-500',
  error: 'bg-red-600 dark:bg-red-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind) => {
    const id = Date.now();
    setToast({ id, message, kind });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          role="status"
          data-testid="toast"
          className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${TONE[toast.kind]}`}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
```

Delete `dashboard/src/components/Toast.css`.

- [ ] **Step 3: Migrate `MessageDetailPage` — drop the standalone back-link (Layout nav supersedes it)**

Replace `dashboard/src/pages/MessageDetailPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Message } from '../types/message';
import { getMessage, replayMessage, setMessageSpam } from '../api/messages';
import { ApiError } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { ClassificationBadge } from '../components/ClassificationBadge';
import { SpamBadge } from '../components/SpamBadge';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { useToast } from '../components/Toast';

type LoadState = 'loading' | 'found' | 'not-found' | 'error';

export function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>('loading');
  const [message, setMessage] = useState<Message | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [replaying, setReplaying] = useState(false);
  const [updatingSpam, setUpdatingSpam] = useState(false);

  async function handleMarkNotSpam() {
    if (!id) return;

    setUpdatingSpam(true);
    try {
      const updated = await setMessageSpam(id, false);
      setMessage(updated);
      showToast('Marked as not spam.', 'success');
    } catch (error: unknown) {
      console.error('Failed to update spam status', error);
      showToast('Failed to update spam status.', 'error');
    } finally {
      setUpdatingSpam(false);
    }
  }

  async function handleCopyOtp(otp: string) {
    try {
      await navigator.clipboard.writeText(otp);
      showToast('OTP copied to clipboard.', 'success');
    } catch (error: unknown) {
      console.error('Failed to copy OTP', error);
      showToast('Failed to copy OTP.', 'error');
    }
  }

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    getMessage(id ?? '')
      .then((found) => {
        if (cancelled) return;
        setMessage(found);
        setState('found');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setState('not-found');
        } else {
          console.error('Failed to load message', error);
          setState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, retryToken]);

  async function handleReplay() {
    if (!id || !window.confirm('Replay this message as a new captured message?')) {
      return;
    }

    setReplaying(true);
    try {
      await replayMessage(id);
      showToast('Message replayed successfully.', 'success');
      navigate('/');
    } catch (error: unknown) {
      console.error('Failed to replay message', error);
      showToast('Failed to replay message.', 'error');
    } finally {
      setReplaying(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {state === 'loading' && <Spinner label="Loading message…" />}

      {state === 'error' && (
        <ErrorBanner message="Couldn't load this message." onRetry={() => setRetryToken((t) => t + 1)} />
      )}

      {state === 'not-found' && (
        <div data-testid="detail-not-found">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Message not found</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No message with id "{id}" exists.</p>
        </div>
      )}

      {state === 'found' && message && (
        <article data-testid="detail-found" className="flex flex-col gap-4">
          <header className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Message detail</h1>
            <StatusBadge status={message.status} />
            {message.category && <ClassificationBadge category={message.category} />}
            {message.is_spam && <SpamBadge />}
            <button
              type="button"
              onClick={handleReplay}
              disabled={replaying}
              className="ml-auto rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
            >
              {replaying ? 'Replaying…' : 'Replay'}
            </button>
          </header>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-slate-200 p-4 text-sm sm:grid-cols-2 dark:border-slate-800">
            <dt className="text-slate-500 dark:text-slate-400">ID</dt>
            <dd className="break-all">{message.id}</dd>
            <dt className="text-slate-500 dark:text-slate-400">To</dt>
            <dd>{message.to}</dd>
            <dt className="text-slate-500 dark:text-slate-400">From</dt>
            <dd>{message.from}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Captured</dt>
            <dd>{new Date(message.created_at).toLocaleString()}</dd>
          </dl>

          {message.otp && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950/40">
              <span className="text-sm font-medium text-purple-800 dark:text-purple-300">OTP detected</span>
              <span className="rounded bg-white px-2 py-1 font-mono text-sm dark:bg-slate-900">{message.otp}</span>
              <button
                type="button"
                onClick={() => handleCopyOtp(message.otp!)}
                className="rounded-md border border-purple-300 px-3 py-1 text-sm font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/40"
              >
                Copy
              </button>
            </div>
          )}

          {message.is_spam && (
            <button
              type="button"
              onClick={handleMarkNotSpam}
              disabled={updatingSpam}
              className="self-start rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {updatingSpam ? 'Updating…' : 'Not spam'}
            </button>
          )}

          <div className="whitespace-pre-wrap rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
            {message.message}
          </div>
        </article>
      )}
    </div>
  );
}
```

Delete `dashboard/src/pages/MessageDetailPage.css`.

- [ ] **Step 4: Verify build, lint, and manual check**

Run: `cd /mnt/200GB/Downloads/SMSPit/dashboard && npm run build && npm run lint`
Expected: both succeed.
Then `npm run dev`, navigate from an inbox row to its detail page, confirm layout at 375px and 1280px, confirm Replay/Copy/Not spam buttons and toast still work.

- [ ] **Step 5: Commit**

```bash
cd /mnt/200GB/Downloads/SMSPit/dashboard && git add src/pages/MessageDetailPage.tsx src/components/Spinner.tsx src/components/Toast.tsx && git add -u src/pages/MessageDetailPage.css src/components/Spinner.css src/components/Toast.css && git commit -m "Migrate Message Detail page, Spinner, and Toast to Tailwind"
```

---

### Task 6: Migrate Compose page

**Files:**
- Modify: `dashboard/src/pages/ComposePage.tsx`; Delete: `dashboard/src/pages/ComposePage.css`
- Modify: `dashboard/src/components/TemplatePicker.tsx`; Delete: `dashboard/src/components/TemplatePicker.css`

**Interfaces:**
- Consumes: `useToast()` (Task 5, unchanged).
- Produces: `TemplatePicker({ onInsert })` unchanged signature.

- [ ] **Step 1: Migrate `TemplatePicker`**

Replace `dashboard/src/components/TemplatePicker.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { Template } from '../types/template';
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from '../api/templates';
import { useToast } from './Toast';

const VARIABLE_PATTERN = /{{\s*([\w.]+)\s*}}/g;

function detectVariables(body: string): string[] {
  const names = new Set<string>();
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    names.add(match[1]);
  }
  return [...names];
}

function renderBody(body: string, values: Record<string, string>): string {
  return body.replace(VARIABLE_PATTERN, (full, name: string) => values[name] ?? full);
}

interface TemplateFormState {
  name: string;
  body: string;
}

const EMPTY_FORM: TemplateFormState = { name: '', body: '' };

const inputClasses =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function TemplatePicker({ onInsert }: { onInsert: (body: string) => void }) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<number | null | 'new'>(null);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;

    listTemplates()
      .then((response) => {
        if (cancelled) return;
        setTemplates(response.templates);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load templates', err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  function selectTemplate(template: Template) {
    setSelectedId(template.id);
    setVariableValues(Object.fromEntries(template.variables.map((name) => [name, ''])));
  }

  function startCreate() {
    setEditingId('new');
    setForm(EMPTY_FORM);
  }

  function startEdit(template: Template) {
    setEditingId(template.id);
    setForm({ name: template.name, body: template.body });
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const variables = detectVariables(form.body);

    try {
      if (editingId === 'new') {
        const created = await createTemplate({ name: form.name, body: form.body, variables });
        setTemplates((current) => [created, ...current]);
        showToast('Template created.', 'success');
      } else if (editingId !== null) {
        const updated = await updateTemplate(editingId, { name: form.name, body: form.body, variables });
        setTemplates((current) => current.map((t) => (t.id === updated.id ? updated : t)));
        showToast('Template updated.', 'success');
      }
      setEditingId(null);
    } catch (err: unknown) {
      console.error('Failed to save template', err);
      showToast('Failed to save template.', 'error');
    }
  }

  async function handleDelete(template: Template) {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;

    try {
      await deleteTemplate(template.id);
      setTemplates((current) => current.filter((t) => t.id !== template.id));
      if (selectedId === template.id) setSelectedId(null);
      showToast('Template deleted.', 'success');
    } catch (err: unknown) {
      console.error('Failed to delete template', err);
      showToast('Failed to delete template.', 'error');
    }
  }

  function handleInsert() {
    if (!selected) return;
    onInsert(renderBody(selected.body, variableValues));
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Templates</h2>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-md border border-slate-200 px-3 py-1 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          + New template
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading templates…</p>}

      {!loading && templates.length === 0 && editingId === null && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No templates yet. Create one to reuse common message bodies.
        </p>
      )}

      {!loading && templates.length > 0 && (
        <ul className="flex flex-col gap-1">
          {templates.map((template) => (
            <li
              key={template.id}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                selectedId === template.id ? 'bg-purple-600/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <button type="button" onClick={() => selectTemplate(template)} className="text-left">
                {template.name}
              </button>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => startEdit(template)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(template)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          {selected.variables.map((name) => (
            <label key={name} className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
              {name}
              <input
                value={variableValues[name] ?? ''}
                onChange={(e) => setVariableValues((current) => ({ ...current, [name]: e.target.value }))}
                placeholder={`Value for {{${name}}}`}
                className={inputClasses}
              />
            </label>
          ))}
          <button
            type="button"
            onClick={handleInsert}
            className="mt-1 self-start rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-400"
          >
            Insert into message
          </button>
        </div>
      )}

      {editingId !== null && (
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <input
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            placeholder="Template name"
            required
            className={inputClasses}
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm((current) => ({ ...current, body: e.target.value }))}
            placeholder="Your OTP is {{code}}"
            rows={3}
            required
            className={inputClasses}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Use {'{{variable}}'} placeholders — they're detected automatically.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-400"
            >
              {editingId === 'new' ? 'Create' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
```

Delete `dashboard/src/components/TemplatePicker.css`.

- [ ] **Step 2: Migrate `ComposePage` — remove standalone back-link, responsive two-column layout**

Replace `dashboard/src/pages/ComposePage.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMessage } from '../api/messages';
import { TemplatePicker } from '../components/TemplatePicker';
import { useToast } from '../components/Toast';

export function ComposePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await createMessage({ to, from, message: body });
      showToast('Message captured.', 'success');
      navigate('/');
    } catch (err: unknown) {
      console.error('Failed to send message', err);
      showToast('Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  }

  const inputClasses =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Compose</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Send a test message, optionally starting from a saved template.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            To
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+8801700000000" required className={inputClasses} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            From
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="SMSPit" required className={inputClasses} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            Message
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} required className={inputClasses} />
          </label>
          <button
            type="submit"
            disabled={sending}
            className="self-start rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>

        <TemplatePicker onInsert={setBody} />
      </div>
    </div>
  );
}
```

Delete `dashboard/src/pages/ComposePage.css`.

- [ ] **Step 3: Verify build, lint, and manual check**

Run: `cd /mnt/200GB/Downloads/SMSPit/dashboard && npm run build && npm run lint`
Expected: both succeed.
Then `npm run dev`, open `/compose`, confirm two-column layout at 1280px collapses to one column at 375px, template picker still creates/edits/inserts correctly.

- [ ] **Step 4: Commit**

```bash
cd /mnt/200GB/Downloads/SMSPit/dashboard && git add src/pages/ComposePage.tsx src/components/TemplatePicker.tsx && git add -u src/pages/ComposePage.css src/components/TemplatePicker.css && git commit -m "Migrate Compose page and TemplatePicker to Tailwind"
```

---

### Task 7: Migrate Statistics page

**Files:**
- Modify: `dashboard/src/pages/StatisticsPage.tsx`; Delete: `dashboard/src/pages/StatisticsPage.css`
- Modify: `dashboard/src/components/StatCard.tsx`; Delete: `dashboard/src/components/StatCard.css`
- Modify: `dashboard/src/components/VolumeChart.tsx`; Delete: `dashboard/src/components/VolumeChart.css`

**Interfaces:**
- Consumes: `Spinner`, `ErrorBanner` (unchanged).
- Produces: `StatCard({ label, value, tone })`, `VolumeChart({ data })` unchanged signatures.

- [ ] **Step 1: Migrate `StatCard`**

Replace `dashboard/src/components/StatCard.tsx`:

```tsx
const TONE: Record<'neutral' | 'good' | 'critical', string> = {
  neutral: 'text-slate-900 dark:text-white',
  good: 'text-green-600 dark:text-green-400',
  critical: 'text-red-600 dark:text-red-400',
};

export function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'good' | 'critical';
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <span className="block text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`mt-1 block text-3xl font-semibold ${TONE[tone]}`}>{value.toLocaleString()}</span>
    </div>
  );
}
```

Delete `dashboard/src/components/StatCard.css`.

- [ ] **Step 2: Migrate `VolumeChart`**

Replace `dashboard/src/components/VolumeChart.tsx`:

```tsx
import type { DailyCount } from '../types/statistics';

// Fixed design-pixel viewBox (not percentage-based) so the SVG scales
// uniformly on both axes -- a percentage-width viewBox stretched non-
// uniformly would skew the bars' rounded corners into ellipses.
const CHART_WIDTH = 800;
const CHART_HEIGHT = 180;
const BASELINE_Y = CHART_HEIGHT - 24;
const BAR_MAX_WIDTH = 32;
const BAR_GAP = 4;

function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${month}/${day}`;
}

// Rounded top corners, square baseline -- a plain <rect rx> rounds all
// four corners, which reads wrong for a bar anchored to a baseline.
function topRoundedBarPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height);
  return `
    M ${x} ${y + height}
    L ${x} ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    L ${x + width - r} ${y}
    Q ${x + width} ${y} ${x + width} ${y + r}
    L ${x + width} ${y + height}
    Z
  `;
}

export function VolumeChart({ data }: { data: DailyCount[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No messages captured yet.</p>;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const bandWidth = CHART_WIDTH / data.length;
  const barWidth = Math.min(BAR_MAX_WIDTH, bandWidth - BAR_GAP);

  return (
    <div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="Message volume by day"
        className="w-full"
      >
        <line
          x1="0"
          y1={BASELINE_Y}
          x2={CHART_WIDTH}
          y2={BASELINE_Y}
          className="stroke-slate-200 dark:stroke-slate-800"
          strokeWidth={1}
        />
        {data.map((point, index) => {
          const barHeight = (point.count / maxCount) * (BASELINE_Y - 12);
          const x = index * bandWidth + (bandWidth - barWidth) / 2;
          const y = BASELINE_Y - barHeight;
          const height = Math.max(barHeight, 0);
          return (
            <path
              key={point.date}
              d={topRoundedBarPath(x, y, barWidth, height, 4)}
              className="fill-purple-600 dark:fill-purple-400"
            >
              <title>
                {point.date}: {point.count} message{point.count === 1 ? '' : 's'}
              </title>
            </path>
          );
        })}
      </svg>
      <div className="mt-1 flex text-xs text-slate-500 dark:text-slate-400">
        {data.map((point) => (
          <span key={point.date} style={{ width: `${(bandWidth / CHART_WIDTH) * 100}%` }}>
            {formatShortDate(point.date)}
          </span>
        ))}
      </div>
    </div>
  );
}
```

Delete `dashboard/src/components/VolumeChart.css`.

- [ ] **Step 3: Migrate `StatisticsPage` — remove standalone back-link, responsive card grid**

Replace `dashboard/src/pages/StatisticsPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { Statistics } from '../types/statistics';
import { getStatistics } from '../api/statistics';
import { StatCard } from '../components/StatCard';
import { VolumeChart } from '../components/VolumeChart';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';

export function StatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getStatistics()
      .then((result) => {
        if (cancelled) return;
        setStatistics(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load statistics', err);
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Statistics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Message volume and status breakdown.</p>
      </header>

      {loading && <Spinner label="Loading statistics…" />}

      {error && <ErrorBanner message="Couldn't load statistics." onRetry={() => setRetryToken((t) => t + 1)} />}

      {!loading && !error && statistics && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total messages" value={statistics.total} />
            <StatCard label="Captured" value={statistics.by_status.captured ?? 0} tone="good" />
            <StatCard label="Failed" value={statistics.by_status.failed ?? 0} tone="critical" />
          </div>

          <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Message volume</h2>
            <VolumeChart data={statistics.by_day} />
          </section>
        </>
      )}
    </div>
  );
}
```

Delete `dashboard/src/pages/StatisticsPage.css`.

- [ ] **Step 4: Verify build, lint, and manual check**

Run: `cd /mnt/200GB/Downloads/SMSPit/dashboard && npm run build && npm run lint`
Expected: both succeed.
Then `npm run dev`, open `/statistics`, confirm the 3 stat cards go to 1 column at 375px and stay 3 columns at 1280px, chart renders full-width at both.

- [ ] **Step 5: Commit**

```bash
cd /mnt/200GB/Downloads/SMSPit/dashboard && git add src/pages/StatisticsPage.tsx src/components/StatCard.tsx src/components/VolumeChart.tsx && git add -u src/pages/StatisticsPage.css src/components/StatCard.css src/components/VolumeChart.css && git commit -m "Migrate Statistics page, StatCard, and VolumeChart to Tailwind"
```

---

### Task 8: Migrate API Keys page

**Files:**
- Modify: `dashboard/src/pages/ApiKeysPage.tsx`; Delete: `dashboard/src/pages/ApiKeysPage.css`

**Interfaces:**
- Consumes: `Spinner`, `ErrorBanner`, `useToast()` (all unchanged).

- [ ] **Step 1: Migrate `ApiKeysPage` — remove standalone back-link, responsive table (scrolls horizontally on mobile rather than stacking, since it's an admin-density table with 7 columns including a raw key — stacking would make the key hard to scan)**

Replace `dashboard/src/pages/ApiKeysPage.tsx`:

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import type { ApiKey } from '../types/apiKey';
import { createApiKey, listApiKeys, revokeApiKey } from '../api/apiKeys';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { useToast } from '../components/Toast';

function formatTimestamp(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export function ApiKeysPage() {
  const { showToast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    listApiKeys()
      .then((response) => {
        if (cancelled) return;
        setApiKeys(response.api_keys);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load API keys', err);
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const ownerIdNumber = Number(ownerId);
    if (!name.trim() || !Number.isInteger(ownerIdNumber) || ownerIdNumber <= 0) {
      showToast('Enter a name and a valid owner ID.', 'error');
      return;
    }

    setCreating(true);
    try {
      const created = await createApiKey({ name: name.trim(), owner_id: ownerIdNumber });
      setNewlyCreatedKey(created.key);
      setName('');
      setOwnerId('');
      setRetryToken((t) => t + 1);
      showToast('API key created.', 'success');
    } catch (err) {
      console.error('Failed to create API key', err);
      showToast('Failed to create API key.', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(apiKey: ApiKey) {
    if (!window.confirm(`Revoke the key "${apiKey.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await revokeApiKey(apiKey.id);
      showToast('API key revoked.', 'success');
      setRetryToken((t) => t + 1);
    } catch (err) {
      console.error('Failed to revoke API key', err);
      showToast('Failed to revoke API key.', 'error');
    }
  }

  async function handleCopy(key: string) {
    await navigator.clipboard.writeText(key);
    showToast('Copied to clipboard.', 'success');
  }

  const inputClasses =
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">API keys</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create and manage API keys used to authenticate against SMSPit's API.
        </p>
      </header>

      {newlyCreatedKey && (
        <div
          data-testid="new-key-banner"
          className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-green-900 dark:bg-green-950/40"
        >
          <div>
            <strong className="block text-sm text-green-900 dark:text-green-300">
              New key created — copy it now, it won't be shown again:
            </strong>
            <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs dark:bg-slate-900">{newlyCreatedKey}</code>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleCopy(newlyCreatedKey)}
              className="rounded-md border border-green-300 px-3 py-1.5 text-sm font-medium hover:bg-green-100 dark:border-green-800 dark:hover:bg-green-900/40"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setNewlyCreatedKey(null)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
          Key name
          <input
            type="text"
            placeholder="Key name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Key name"
            className={inputClasses}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
          Owner ID
          <input
            type="number"
            placeholder="Owner ID"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            aria-label="Owner ID"
            min={1}
            className={inputClasses}
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-400"
        >
          {creating ? 'Creating…' : 'Create key'}
        </button>
      </form>

      {loading && <Spinner label="Loading API keys…" />}

      {error && <ErrorBanner message="Couldn't load API keys." onRetry={() => setRetryToken((t) => t + 1)} />}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Key</th>
                <th className="py-2 pr-4 font-medium">Owner</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Last used</th>
                <th className="py-2 pr-4 font-medium">Created</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 dark:text-slate-400">
                    No API keys yet.
                  </td>
                </tr>
              )}
              {apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="border-b border-slate-100 dark:border-slate-900">
                  <td className="py-3 pr-4">{apiKey.name}</td>
                  <td className="py-3 pr-4">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{apiKey.key}</code>
                  </td>
                  <td className="py-3 pr-4">{apiKey.owner_id}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        apiKey.revoked_at
                          ? 'bg-slate-500/10 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300'
                          : 'bg-green-600/10 text-green-700 dark:bg-green-400/15 dark:text-green-400'
                      }`}
                    >
                      {apiKey.revoked_at ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{formatTimestamp(apiKey.last_used_at)}</td>
                  <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{formatTimestamp(apiKey.created_at)}</td>
                  <td className="py-3">
                    {!apiKey.revoked_at && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(apiKey)}
                        className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

Delete `dashboard/src/pages/ApiKeysPage.css`.

- [ ] **Step 2: Verify build, lint, and manual check**

Run: `cd /mnt/200GB/Downloads/SMSPit/dashboard && npm run build && npm run lint`
Expected: both succeed.
Then `npm run dev`, open `/api-keys`, confirm the create-key form stacks on mobile and sits in a row on desktop, confirm the table scrolls horizontally within its own container at 375px (page itself doesn't scroll horizontally), create/revoke/copy still work.

- [ ] **Step 3: Commit**

```bash
cd /mnt/200GB/Downloads/SMSPit/dashboard && git add src/pages/ApiKeysPage.tsx && git add -u src/pages/ApiKeysPage.css && git commit -m "Migrate API Keys page to Tailwind"
```

---

### Task 9: Migrate Organizations page

**Files:**
- Modify: `dashboard/src/pages/OrganizationsPage.tsx`; Delete: `dashboard/src/pages/OrganizationsPage.css`

**Interfaces:**
- Consumes: `OrgSwitcher` (Task 4, unchanged), `Spinner`, `ErrorBanner` (unchanged).

- [ ] **Step 1: Migrate `OrganizationsPage` — remove standalone back-link**

Replace `dashboard/src/pages/OrganizationsPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { Team } from '../types/organization';
import { listTeams } from '../api/organizations';
import { useOrg } from '../context/OrgContext';
import { OrgSwitcher } from '../components/OrgSwitcher';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';

export function OrganizationsPage() {
  const { organizations, loading: loadingOrgs, selectedOrgId } = useOrg();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) ?? null;

  // Re-fetches whenever the switcher changes selectedOrgId -- the whole
  // point of Day 60's "refetch data on org switch" requirement.
  useEffect(() => {
    if (selectedOrgId === null) {
      setTeams([]);
      setLoadingTeams(false);
      return;
    }

    let cancelled = false;
    setLoadingTeams(true);
    setError(false);

    listTeams(selectedOrgId)
      .then((response) => {
        if (cancelled) return;
        setTeams(response.teams);
        setLoadingTeams(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load teams', err);
        setError(true);
        setLoadingTeams(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOrgId, retryToken]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Organizations</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Switch organizations and see their teams.</p>
      </header>

      {loadingOrgs && <Spinner label="Loading organizations…" />}

      {!loadingOrgs && organizations.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You're not a member of any organization yet. Create one via{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">POST /api/organizations</code>.
        </p>
      )}

      {!loadingOrgs && organizations.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <OrgSwitcher />
            {selectedOrg && <span className="text-sm text-slate-500 dark:text-slate-400">Role: {selectedOrg.role}</span>}
          </div>

          {loadingTeams && <Spinner label="Loading teams…" />}

          {error && <ErrorBanner message="Couldn't load teams." onRetry={() => setRetryToken((t) => t + 1)} />}

          {!loadingTeams && !error && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teams.length === 0 && <li className="text-sm text-slate-500 dark:text-slate-400">No teams yet.</li>}
              {teams.map((team) => (
                <li key={team.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{team.name}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {team.members.length === 0
                      ? 'No members yet.'
                      : team.members.map((member) => member.name).join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
```

Delete `dashboard/src/pages/OrganizationsPage.css`.

- [ ] **Step 2: Verify build, lint, and manual check**

Run: `cd /mnt/200GB/Downloads/SMSPit/dashboard && npm run build && npm run lint`
Expected: both succeed.
Then `npm run dev`, open `/organizations`, confirm the teams grid goes 1 → 2 → 3 columns across 375px/768px/1280px.

- [ ] **Step 3: Confirm no CSS files remain**

Run: `find /mnt/200GB/Downloads/SMSPit/dashboard/src -name '*.css'`
Expected: only `dashboard/src/index.css` remains.

- [ ] **Step 4: Commit**

```bash
cd /mnt/200GB/Downloads/SMSPit/dashboard && git add src/pages/OrganizationsPage.tsx && git add -u src/pages/OrganizationsPage.css && git commit -m "Migrate Organizations page to Tailwind"
```

---

### Task 10: Full-app verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full build and lint**

Run: `cd /mnt/200GB/Downloads/SMSPit/dashboard && npm run build && npm run lint`
Expected: both succeed with zero errors/warnings.

- [ ] **Step 2: Walk every route at 3 breakpoints, both themes**

Run `npm run dev`, open `http://127.0.0.1:5173/`. For each of `/`, `/messages/:id` (via clicking a row), `/compose`, `/statistics`, `/api-keys`, `/organizations`:
- Check at 375px, 768px, 1280px widths (browser devtools device toolbar) — no horizontal page scroll, no overlapping text, nav behaves correctly (drawer <768px, row ≥768px).
- Toggle theme once per page — confirm text stays readable, no invisible-on-background elements, toggle state persists across a page navigation (it's global state, so this should hold automatically).
- Refresh the page — confirm the theme choice persists (reads from `localStorage`).

- [ ] **Step 3: Confirm no regressions in interactive flows**

Exercise: Inbox filters (typing in "To" narrows results), Export (CSV/JSON download triggers), Generate test data (creates messages, toast confirms), row click → detail → Replay → toast → navigates back to inbox, Compose → send → toast → navigates to inbox, Statistics loads real data, API Keys create/revoke/copy, Organizations switcher changes visible teams.

- [ ] **Step 4: Final commit if any fixes were needed**

If Steps 1–3 required fixes, commit them:

```bash
cd /mnt/200GB/Downloads/SMSPit/dashboard && git add -A && git commit -m "Fix issues found in full-app verification pass"
```

If no fixes were needed, skip this step — nothing to commit.
