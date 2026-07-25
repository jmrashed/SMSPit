import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { OrgSwitcher } from './OrgSwitcher';
import { ObservabilityMenu } from './ObservabilityMenu';
import { ThemeToggle } from './ThemeToggle';

const NAV_LINKS = [
  { to: '/', label: 'Inbox', end: true },
  { to: '/compose', label: 'Compose', end: false },
  { to: '/templates', label: 'Templates', end: false },
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
            <ObservabilityMenu />
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
            <div className="mt-2 flex items-center gap-3 border-t border-slate-200 pt-2 dark:border-slate-800">
              <OrgSwitcher />
              <ObservabilityMenu />
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
