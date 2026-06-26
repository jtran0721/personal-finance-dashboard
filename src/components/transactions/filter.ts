import type { TxType } from '@/types';

export interface TxFilter {
  search: string;
  type: 'all' | TxType;
  categoryId: 'all' | string;
  account: 'all' | string;
}

export const EMPTY_FILTER: TxFilter = { search: '', type: 'all', categoryId: 'all', account: 'all' };
