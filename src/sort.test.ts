import { describe, expect, it } from 'vitest';
import { sortRows } from './sort';
describe('explorer sorting', () => {
  const rows = [{ name: 'Zulu', count: 1, updated: 1 }, { name: 'alpha', count: 3, updated: 2 }];
  it('sorts folder name, count, and update values', () => {
    expect(sortRows(rows, { key: 'name', direction: 'asc' }, (r, k) => r[k as 'name' | 'count' | 'updated']).map(r => r.name)).toEqual(['alpha', 'Zulu']);
    expect(sortRows(rows, { key: 'count', direction: 'desc' }, (r, k) => r[k as 'name' | 'count' | 'updated'])[0].name).toBe('alpha');
  });
  it('sorts resource identifier, status, size, and update values', () => {
    const resources = [
      { identifier: 'z', status: 'READY', size: 20, updated: 1 },
      { identifier: 'a', status: 'PUBLISHED', size: 10, updated: 2 },
    ];
    const value = (row: typeof resources[number], key: string) => key in row ? row[key as keyof typeof row] : '';
    expect(sortRows(resources, { key: 'identifier', direction: 'asc' }, value).map(row => row.identifier)).toEqual(['a', 'z']);
    expect(sortRows(resources, { key: 'status', direction: 'asc' }, value)[0].status).toBe('PUBLISHED');
    expect(sortRows(resources, { key: 'size', direction: 'desc' }, value)[0].size).toBe(20);
    expect(sortRows(resources, { key: 'updated', direction: 'desc' }, value)[0].updated).toBe(2);
  });
});
