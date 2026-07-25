import type { ChangeEvent } from 'react';
import type { MessageFilters as MessageFiltersState } from '../types/filters';

interface Props {
  filters: MessageFiltersState;
  onChange: (filters: MessageFiltersState) => void;
}

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All categories' },
  { value: 'otp', label: 'OTP' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

const SPAM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All messages' },
  { value: 'false', label: 'Hide spam' },
  { value: 'true', label: 'Spam only' },
];

const fieldClasses =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function MessageFilters({ filters, onChange }: Props) {
  const handleField =
    (field: keyof MessageFiltersState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ ...filters, [field]: event.target.value });
    };

  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      onSubmit={(e) => e.preventDefault()}
      role="search"
    >
      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>To</span>
        <input type="text" placeholder="+8801700000000" value={filters.to} onChange={handleField('to')} className={fieldClasses} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>From</span>
        <input type="text" placeholder="SMSPit" value={filters.from} onChange={handleField('from')} className={fieldClasses} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>Category</span>
        <select value={filters.category} onChange={handleField('category')} className={fieldClasses}>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>Spam</span>
        <select value={filters.isSpam} onChange={handleField('isSpam')} className={fieldClasses}>
          {SPAM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>From date</span>
        <input type="date" value={filters.createdAfter} onChange={handleField('createdAfter')} className={fieldClasses} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
        <span>To date</span>
        <input type="date" value={filters.createdBefore} onChange={handleField('createdBefore')} className={fieldClasses} />
      </label>
    </form>
  );
}
