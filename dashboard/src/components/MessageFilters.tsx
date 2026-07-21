import type { ChangeEvent } from 'react';
import type { MessageFilters as MessageFiltersState } from '../types/filters';
import './MessageFilters.css';

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

export function MessageFilters({ filters, onChange }: Props) {
  const handleField =
    (field: keyof MessageFiltersState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ ...filters, [field]: event.target.value });
    };

  return (
    <form className="message-filters" onSubmit={(e) => e.preventDefault()} role="search">
      <label className="message-filters__field">
        <span>To</span>
        <input type="text" placeholder="+8801700000000" value={filters.to} onChange={handleField('to')} />
      </label>

      <label className="message-filters__field">
        <span>From</span>
        <input type="text" placeholder="SMSPit" value={filters.from} onChange={handleField('from')} />
      </label>

      <label className="message-filters__field">
        <span>Category</span>
        <select value={filters.category} onChange={handleField('category')}>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="message-filters__field">
        <span>Spam</span>
        <select value={filters.isSpam} onChange={handleField('isSpam')}>
          {SPAM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="message-filters__field">
        <span>From date</span>
        <input type="date" value={filters.createdAfter} onChange={handleField('createdAfter')} />
      </label>

      <label className="message-filters__field">
        <span>To date</span>
        <input type="date" value={filters.createdBefore} onChange={handleField('createdBefore')} />
      </label>
    </form>
  );
}
