import type { Message } from '../types/message';
import { StatusBadge } from './StatusBadge';
import './MessageList.css';

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function MessageList({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return <p className="message-list-empty">No messages captured yet.</p>;
  }

  return (
    <table className="message-list">
      <thead>
        <tr>
          <th>To</th>
          <th>From</th>
          <th>Message</th>
          <th>Status</th>
          <th>Captured</th>
        </tr>
      </thead>
      <tbody>
        {messages.map((message) => (
          <tr key={message.id} data-testid="message-row">
            <td data-label="To">{message.to}</td>
            <td data-label="From">{message.from}</td>
            <td data-label="Message" className="message-list__body">
              {message.message}
            </td>
            <td data-label="Status">
              <StatusBadge status={message.status} />
            </td>
            <td data-label="Captured">{formatTimestamp(message.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
