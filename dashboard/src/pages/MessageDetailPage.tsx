import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Message } from '../types/message';
import { getMessage } from '../api/messages';
import { ApiError } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import './MessageDetailPage.css';

type LoadState = 'loading' | 'found' | 'not-found' | 'error';

export function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>('loading');
  const [message, setMessage] = useState<Message | null>(null);
  const [retryToken, setRetryToken] = useState(0);

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

  return (
    <main className="message-detail-page">
      <Link to="/" className="message-detail-page__back">
        ← Back to inbox
      </Link>

      {state === 'loading' && <Spinner label="Loading message…" />}

      {state === 'error' && (
        <ErrorBanner message="Couldn't load this message." onRetry={() => setRetryToken((t) => t + 1)} />
      )}

      {state === 'not-found' && (
        <div data-testid="detail-not-found">
          <h1>Message not found</h1>
          <p>No message with id "{id}" exists.</p>
        </div>
      )}

      {state === 'found' && message && (
        <article data-testid="detail-found">
          <header className="message-detail-page__header">
            <h1>Message detail</h1>
            <StatusBadge status={message.status} />
          </header>

          <dl className="message-detail-page__meta">
            <dt>ID</dt>
            <dd>{message.id}</dd>
            <dt>To</dt>
            <dd>{message.to}</dd>
            <dt>From</dt>
            <dd>{message.from}</dd>
            <dt>Captured</dt>
            <dd>{new Date(message.created_at).toLocaleString()}</dd>
          </dl>

          <div className="message-detail-page__body">{message.message}</div>
        </article>
      )}
    </main>
  );
}
