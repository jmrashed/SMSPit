import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Message } from '../types/message';
import { findMockMessageById } from '../mocks/messages';
import { StatusBadge } from '../components/StatusBadge';
import './MessageDetailPage.css';

type LoadState = 'loading' | 'found' | 'not-found';

export function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>('loading');
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    findMockMessageById(id ?? '').then((found) => {
      if (cancelled) return;
      if (found) {
        setMessage(found);
        setState('found');
      } else {
        setState('not-found');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="message-detail-page">
      <Link to="/" className="message-detail-page__back">
        ← Back to inbox
      </Link>

      {state === 'loading' && <p data-testid="detail-loading">Loading message…</p>}

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
