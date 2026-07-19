import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Message } from '../types/message';
import { listMessages } from '../api/messages';
import { MessageList } from '../components/MessageList';
import { MessageFilters } from '../components/MessageFilters';
import { MessageListSkeleton } from '../components/MessageListSkeleton';
import { ErrorBanner } from '../components/ErrorBanner';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useMessageSocket } from '../hooks/useMessageSocket';
import { OrgSwitcher } from '../components/OrgSwitcher';
import { EMPTY_FILTERS, type MessageFilters as MessageFiltersState } from '../types/filters';
import './InboxPage.css';

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
    <main className="inbox-page">
      <header className="inbox-page__header">
        <div className="inbox-page__header-row">
          <h1>Inbox</h1>
          <div className="inbox-page__nav-links">
            <OrgSwitcher />
            <Link to="/organizations" className="inbox-page__stats-link">
              Organizations
            </Link>
            <Link to="/statistics" className="inbox-page__stats-link">
              Statistics
            </Link>
            <Link to="/api-keys" className="inbox-page__stats-link">
              API keys
            </Link>
          </div>
        </div>
        <p>Messages captured by SMSPit instead of being delivered.</p>
      </header>
      <MessageFilters filters={filters} onChange={setFilters} />
      {error && (
        <ErrorBanner
          message="Couldn't load messages. Check that sms-service is running."
          onRetry={() => setRetryToken((t) => t + 1)}
        />
      )}
      {!error && (loading ? <MessageListSkeleton /> : <MessageList messages={messages} />)}
    </main>
  );
}
