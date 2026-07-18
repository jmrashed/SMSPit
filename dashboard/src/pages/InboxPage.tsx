import type { Message } from '../types/message';
import { MessageList } from '../components/MessageList';
import './InboxPage.css';

// Static placeholder data -- real API wiring lands on Day 23
// (checklist.md), which replaces this with a fetched message list.
const MOCK_MESSAGES: Message[] = [
  {
    id: 'sms_1',
    to: '+8801700000001',
    from: 'SMSPit',
    message: 'Your OTP is 845231',
    status: 'captured',
    created_at: '2026-07-19T01:00:00.000Z',
  },
  {
    id: 'sms_2',
    to: '+8801700000002',
    from: 'SMSPit',
    message: 'Your order has shipped and is on its way.',
    status: 'captured',
    created_at: '2026-07-19T00:45:00.000Z',
  },
  {
    id: 'sms_3',
    to: '+8801700000003',
    from: 'SMSPit',
    message: 'Delivery failed: invalid number',
    status: 'failed',
    created_at: '2026-07-19T00:30:00.000Z',
  },
];

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
