import { useEffect, useState } from 'react';
import type { Message } from '../types/message';
import { listMessages } from '../api/messages';
import { MessageList } from '../components/MessageList';
import { MessageFilters } from '../components/MessageFilters';
import { MessageListSkeleton } from '../components/MessageListSkeleton';
import { ErrorBanner } from '../components/ErrorBanner';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useMessageSocket } from '../hooks/useMessageSocket';
import { ExportButton } from '../components/ExportButton';
import { GenerateTestDataButton } from '../components/GenerateTestDataButton';
import { EMPTY_FILTERS, type MessageFilters as MessageFiltersState } from '../types/filters';

// Date-only inputs mean "before end of day" should include the whole
// selected day, not just midnight.
function endOfDay(dateOnly: string): string {
  return `${dateOnly}T23:59:59.999Z`;
}

export function InboxPage() {
  const [filters, setFilters] = useState<MessageFiltersState>(EMPTY_FILTERS);
  const debouncedFilters = useDebouncedValue(filters, 300);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    listMessages({
      to: debouncedFilters.to,
      from: debouncedFilters.from,
      category: debouncedFilters.category || undefined,
      is_spam: debouncedFilters.isSpam ? debouncedFilters.isSpam === 'true' : undefined,
      created_after: debouncedFilters.createdAfter || undefined,
      created_before: debouncedFilters.createdBefore ? endOfDay(debouncedFilters.createdBefore) : undefined,
    })
      .then((response) => {
        if (cancelled) return;
        setMessages(response.messages);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load messages', err);
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedFilters, retryToken]);

  useMessageSocket(() => setRetryToken((t) => t + 1));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Inbox</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Messages captured by SMSPit instead of being delivered.
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <MessageFilters filters={filters} onChange={setFilters} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ExportButton
            filters={{
              to: debouncedFilters.to,
              from: debouncedFilters.from,
              created_after: debouncedFilters.createdAfter || undefined,
              created_before: debouncedFilters.createdBefore ? endOfDay(debouncedFilters.createdBefore) : undefined,
            }}
          />
          <GenerateTestDataButton />
        </div>
      </div>

      {error && (
        <ErrorBanner
          message="Couldn't load messages. Check that sms-service is running."
          onRetry={() => setRetryToken((t) => t + 1)}
        />
      )}
      {!error && (loading ? <MessageListSkeleton /> : <MessageList messages={messages} />)}
    </div>
  );
}
