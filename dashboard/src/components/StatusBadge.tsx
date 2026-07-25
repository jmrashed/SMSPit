import type { MessageStatus } from '../types/message';

const LABELS: Record<MessageStatus, string> = {
  captured: 'Captured',
  failed: 'Failed',
};

const TONE: Record<MessageStatus, string> = {
  captured: 'text-green-700 bg-green-600/10 dark:text-green-400 dark:bg-green-400/15',
  failed: 'text-red-700 bg-red-600/10 dark:text-red-400 dark:bg-red-400/15',
};

export function StatusBadge({ status }: { status: MessageStatus }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {LABELS[status]}
    </span>
  );
}
