import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Message } from '../types/message';
import { StatusBadge } from './StatusBadge';
import './MessageList.css';

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function MessageList({ messages }: { messages: Message[] }) {
  const navigate = useNavigate();

  if (messages.length === 0) {
    return <p className="message-list-empty">No messages captured yet.</p>;
  }

  const goToDetail = (id: string) => navigate(`/messages/${id}`);

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      goToDetail(id);
    }
  };

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
          <tr
            key={message.id}
            data-testid="message-row"
            role="link"
            tabIndex={0}
            onClick={() => goToDetail(message.id)}
            onKeyDown={(event) => handleKeyDown(event, message.id)}
          >
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
