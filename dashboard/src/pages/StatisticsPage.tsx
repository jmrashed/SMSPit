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
