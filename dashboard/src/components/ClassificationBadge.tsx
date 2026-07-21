import type { MessageCategory } from '../types/message';
import './ClassificationBadge.css';

const LABELS: Record<MessageCategory, string> = {
  otp: 'OTP',
  transactional: 'Transactional',
  marketing: 'Marketing',
  other: 'Other',
};

// The 'otp' category is already surfaced by OtpBadge (Day 69) -- showing
// both here would just repeat the same signal twice on one row.
export function ClassificationBadge({ category }: { category: MessageCategory }) {
  if (category === 'otp') {
    return null;
  }

  return <span className={`classification-badge classification-badge--${category}`}>{LABELS[category]}</span>;
}
