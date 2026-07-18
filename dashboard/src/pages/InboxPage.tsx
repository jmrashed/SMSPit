import { useEffect, useState } from 'react';
import type { Message } from '../types/message';
import { listMessages } from '../api/messages';
import { MessageList } from '../components/MessageList';
import { MessageFilters } from '../components/MessageFilters';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listMessages({
      to: debouncedFilters.to,
      from: debouncedFilters.from,
      created_after: debouncedFilters.createdAfter || undefined,
      created_before: debouncedFilters.createdBefore ? endOfDay(debouncedFilters.createdBefore) : undefined,
    }).then((response) => {
      if (cancelled) return;
      setMessages(response.messages);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedFilters]);

  return (
    <main className="inbox-page">
      <header className="inbox-page__header">
        <h1>Inbox</h1>
        <p>Messages captured by SMSPit instead of being delivered.</p>
      </header>
      <MessageFilters filters={filters} onChange={setFilters} />
      {loading ? <p data-testid="inbox-loading">Loading messages…</p> : <MessageList messages={messages} />}
    </main>
  );
}
