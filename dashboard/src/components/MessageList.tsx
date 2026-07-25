import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Message } from '../types/message';
import { StatusBadge } from './StatusBadge';
import { OtpBadge } from './OtpBadge';
import { ClassificationBadge } from './ClassificationBadge';
import { SpamBadge } from './SpamBadge';

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function MessageList({ messages }: { messages: Message[] }) {
  const navigate = useNavigate();

  if (messages.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No messages captured yet.</p>;
  }

  const goToDetail = (id: string) => navigate(`/messages/${id}`);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      goToDetail(id);
    }
  };

  return (
    <>
      {/* Desktop/tablet: table */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th className="py-2 pr-4 font-medium">To</th>
            <th className="py-2 pr-4 font-medium">From</th>
            <th className="py-2 pr-4 font-medium">Message</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 font-medium">Captured</th>
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
              className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 dark:border-slate-900 dark:hover:bg-slate-900"
            >
              <td className="py-3 pr-4 align-top">{message.to}</td>
              <td className="py-3 pr-4 align-top">{message.from}</td>
              <td className="max-w-xs truncate py-3 pr-4 align-top">{message.message}</td>
              <td className="py-3 pr-4 align-top">
                <div className="flex flex-wrap gap-1">
                  <StatusBadge status={message.status} />
                  {message.otp && <OtpBadge />}
                  {message.category && <ClassificationBadge category={message.category} />}
                  {message.is_spam && <SpamBadge />}
                </div>
              </td>
              <td className="py-3 align-top text-slate-500 dark:text-slate-400">{formatTimestamp(message.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {messages.map((message) => (
          <div
            key={message.id}
            data-testid="message-row"
            role="link"
            tabIndex={0}
            onClick={() => goToDetail(message.id)}
            onKeyDown={(event) => handleKeyDown(event, message.id)}
            className="cursor-pointer rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 dark:border-slate-800 dark:hover:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{message.to}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(message.created_at)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">From {message.from}</p>
            <p className="mt-2 line-clamp-2 text-slate-700 dark:text-slate-300">{message.message}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <StatusBadge status={message.status} />
              {message.otp && <OtpBadge />}
              {message.category && <ClassificationBadge category={message.category} />}
              {message.is_spam && <SpamBadge />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
