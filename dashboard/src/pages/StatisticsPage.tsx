import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Statistics } from '../types/statistics';
import { getStatistics } from '../api/statistics';
import { StatCard } from '../components/StatCard';
import { VolumeChart } from '../components/VolumeChart';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import './StatisticsPage.css';

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
    <main className="statistics-page">
      <Link to="/" className="statistics-page__back">
        ← Back to inbox
      </Link>
      <header className="statistics-page__header">
        <h1>Statistics</h1>
        <p>Message volume and status breakdown.</p>
      </header>

      {loading && <Spinner label="Loading statistics…" />}

      {error && (
        <ErrorBanner message="Couldn't load statistics." onRetry={() => setRetryToken((t) => t + 1)} />
      )}

      {!loading && !error && statistics && (
        <>
          <div className="statistics-page__cards">
            <StatCard label="Total messages" value={statistics.total} />
            <StatCard label="Captured" value={statistics.by_status.captured ?? 0} tone="good" />
            <StatCard label="Failed" value={statistics.by_status.failed ?? 0} tone="critical" />
          </div>

          <section className="statistics-page__chart">
            <h2>Message volume</h2>
            <VolumeChart data={statistics.by_day} />
          </section>
        </>
      )}
    </main>
  );
}
