import type { QdnResource } from './types';
export type SortKey = 'count' | 'identifier' | 'name' | 'size' | 'status' | 'updated';
export type Sort = { direction: 'asc' | 'desc'; key: SortKey };
export const updatedOf = (item: Pick<QdnResource, 'created' | 'updated'>) => item.updated ?? item.created ?? 0;
export function sortRows<T>(rows: readonly T[], sort: Sort, value: (row: T, key: SortKey) => number | string) {
  const direction = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => direction * (typeof value(a, sort.key) === 'string' || typeof value(b, sort.key) === 'string' ? String(value(a, sort.key)).localeCompare(String(value(b, sort.key)), undefined, { sensitivity: 'base' }) : Number(value(a, sort.key)) - Number(value(b, sort.key))));
}
