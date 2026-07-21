export interface MessageFilters {
  to: string;
  from: string;
  category: string;
  isSpam: string;
  createdAfter: string;
  createdBefore: string;
}

export const EMPTY_FILTERS: MessageFilters = {
  to: '',
  from: '',
  category: '',
  isSpam: '',
  createdAfter: '',
  createdBefore: '',
};
