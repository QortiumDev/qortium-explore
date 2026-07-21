import { describe, expect, it } from 'vitest';
import { hashForRoute, routeFromHash } from './appRoute';

describe('Explore routes', () => {
  it('round-trips every browse level and detail route', () => {
    const routes = [
      { kind: 'services' }, { kind: 'service', service: 'APP' }, { kind: 'name-services', name: 'Alice' },
      { kind: 'resources', service: 'DOCUMENT', name: 'Alice' }, { kind: 'detail', service: 'FILE', name: 'A name', identifier: 'file 1' },
    ] as const;
    for (const route of routes) expect(routeFromHash(hashForRoute(route))).toEqual(route);
  });
  it('uses the services index for legacy or invalid hashes', () => {
    expect(routeFromHash('#/nope')).toEqual({ kind: 'services' });
  });
});
