import { describe, expect, it } from 'vitest';
import { hashForRoute, routeFromHash, singleResourceDetailRoute } from './appRoute';

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

  it('round-trips a selected file inside a multi-file resource', () => {
    const withIdentifier = { kind: 'detail', service: 'APP', name: 'Explore', identifier: 'Explore', path: 'assets/app.js' } as const;
    const withoutIdentifier = { kind: 'detail', service: 'APP', name: 'Explore', path: 'a b/c.txt' } as const;

    expect(hashForRoute(withIdentifier)).toBe('#/detail/APP/Explore/Explore/file/assets%2Fapp.js');
    expect(routeFromHash(hashForRoute(withIdentifier))).toEqual(withIdentifier);
    expect(hashForRoute(withoutIdentifier)).toBe('#/detail/APP/Explore/default/file/a%20b%2Fc.txt');
    expect(routeFromHash(hashForRoute(withoutIdentifier))).toEqual(withoutIdentifier);
  });

  it('keeps the identifier slot literal when no file is selected', () => {
    expect(routeFromHash('#/detail/APP/Explore/default')).toEqual({ kind: 'detail', service: 'APP', name: 'Explore', identifier: 'default' });
  });

  it('replaces a single name/service result with its detail route', () => {
    const route = { kind: 'resources', service: 'APP', name: 'Alice' } as const;
    const resource = { service: 'APP', name: 'Alice', identifier: 'Explore' };

    expect(singleResourceDetailRoute(route, [resource])).toEqual({
      kind: 'detail',
      service: 'APP',
      name: 'Alice',
      identifier: 'Explore',
    });
    expect(singleResourceDetailRoute(route, [resource, { ...resource, identifier: 'Other' }])).toBeNull();
    expect(singleResourceDetailRoute({ kind: 'service', service: 'APP' }, [resource])).toBeNull();
  });
});
