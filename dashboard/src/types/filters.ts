export interface MessageFilters {
  to: string;
  from: string;
  createdAfter: string;
  createdBefore: string;
}

export const EMPTY_FILTERS: MessageFilters = {
  to: '',
  from: '',
  createdAfter: '',
  createdBefore: '',
};
