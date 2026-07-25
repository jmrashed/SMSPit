import { useState } from 'react';
import { GRAFANA_URL, JAEGER_URL, PROMETHEUS_URL } from '../api/client';

const LINKS = [
  { label: 'Jaeger (traces)', url: JAEGER_URL },
  { label: 'Prometheus (metrics)', url: PROMETHEUS_URL },
  { label: 'Grafana (dashboards)', url: GRAFANA_URL },
];

// These tools run alongside the app stack but aren't proxied through
// it (Day 103) -- plain external links, opened in a new tab, not
// internal routes like the rest of NAV_LINKS.
export function ObservabilityMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Observability
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          onMouseLeave={() => setOpen(false)}
        >
          {LINKS.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
