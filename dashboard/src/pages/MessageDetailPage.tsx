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
