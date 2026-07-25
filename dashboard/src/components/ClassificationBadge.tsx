import type { MessageCategory } from '../types/message';

const LABELS: Record<MessageCategory, string> = {
  otp: 'OTP',
  transactional: 'Transactional',
  marketing: 'Marketing',
  other: 'Other',
};

const TONE: Record<MessageCategory, string> = {
  otp: '',
  transactional: 'text-blue-700 bg-blue-600/10 dark:text-blue-300 dark:bg-blue-400/15',
  marketing: 'text-amber-700 bg-amber-600/10 dark:text-amber-300 dark:bg-amber-400/15',
  other: 'text-slate-700 bg-slate-500/10 dark:text-slate-300 dark:bg-slate-400/15',
};

// The 'otp' category is already surfaced by OtpBadge -- showing both here
// would just repeat the same signal twice on one row.
export function ClassificationBadge({ category }: { category: MessageCategory }) {
  if (category === 'otp') {
    return null;
  }

  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[category]}`}>
      {LABELS[category]}
    </span>
  );
}
