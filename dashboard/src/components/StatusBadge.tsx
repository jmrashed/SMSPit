import type { MessageStatus } from '../types/message';
import './StatusBadge.css';

const LABELS: Record<MessageStatus, string> = {
  captured: 'Captured',
  failed: 'Failed',
};

export function StatusBadge({ status }: { status: MessageStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{LABELS[status]}</span>;
}
