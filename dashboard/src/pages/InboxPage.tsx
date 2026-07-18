import { useEffect, useState } from 'react';
import type { Message } from '../types/message';
import { listMessages } from '../api/messages';
import { MessageList } from '../components/MessageList';
import './InboxPage.css';

export function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    listMessages().then((response) => {
      if (cancelled) return;
      setMessages(response.messages);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="inbox-page">
      <header className="inbox-page__header">
        <h1>Inbox</h1>
        <p>Messages captured by SMSPit instead of being delivered.</p>
      </header>
      {loading ? <p data-testid="inbox-loading">Loading messages…</p> : <MessageList messages={messages} />}
    </main>
  );
}
