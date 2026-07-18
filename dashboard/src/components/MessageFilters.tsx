import type { ChangeEvent } from 'react';
import type { MessageFilters as MessageFiltersState } from '../types/filters';
import './MessageFilters.css';

interface Props {
  filters: MessageFiltersState;
  onChange: (filters: MessageFiltersState) => void;
}

export function MessageFilters({ filters, onChange }: Props) {
  const handleField = (field: keyof MessageFiltersState) => (event: ChangeEvent<HTMLInputElement>) => {
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
