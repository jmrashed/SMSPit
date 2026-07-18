import { MOCK_MESSAGES } from '../mocks/messages';
import { MessageList } from '../components/MessageList';
import './InboxPage.css';

export function InboxPage() {
  return (
    <main className="inbox-page">
      <header className="inbox-page__header">
        <h1>Inbox</h1>
        <p>Messages captured by SMSPit instead of being delivered.</p>
      </header>
      <MessageList messages={MOCK_MESSAGES} />
    </main>
  );
}
