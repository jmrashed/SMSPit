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
