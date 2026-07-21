import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Message } from '../types/message';
import { getMessage, replayMessage, setMessageSpam } from '../api/messages';
import { ApiError } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { ClassificationBadge } from '../components/ClassificationBadge';
import { SpamBadge } from '../components/SpamBadge';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { useToast } from '../components/Toast';
import './MessageDetailPage.css';

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
            {message.category && <ClassificationBadge category={message.category} />}
            {message.is_spam && <SpamBadge />}
            <button
              type="button"
              className="message-detail-page__replay"
              onClick={handleReplay}
              disabled={replaying}
            >
              {replaying ? 'Replaying…' : 'Replay'}
            </button>
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

          {message.otp && (
            <div className="message-detail-page__otp">
              <span className="message-detail-page__otp-label">OTP detected</span>
              <span className="message-detail-page__otp-value">{message.otp}</span>
              <button
                type="button"
                className="message-detail-page__otp-copy"
                onClick={() => handleCopyOtp(message.otp!)}
              >
                Copy
              </button>
            </div>
          )}

          {message.is_spam && (
            <button
              type="button"
              className="message-detail-page__not-spam"
              onClick={handleMarkNotSpam}
              disabled={updatingSpam}
            >
              {updatingSpam ? 'Updating…' : 'Not spam'}
            </button>
          )}

          <div className="message-detail-page__body">{message.message}</div>
        </article>
      )}
    </main>
  );
}
