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
