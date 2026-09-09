import { describe, expect, it } from 'vitest';
import { readWorkspace, workspaceUrl } from './workspaceRoute';
import { hashForRoute, routeFromHash } from './appRoute';
import { referenceSectionUrl } from './ReferenceNavigation';
describe('Developers workspace routing', () => {
  it.each(['developers', 'developer', 'reference'])('normalizes %s while preserving the file hash and repeated host query', view => {
    const hash = hashForRoute({ kind: 'detail', service: 'FILES', name: 'Example', path: 'src/a b.ts' });
    const source = `/render/APP/Explore/Explore?theme=dark&future=a&future=b&view=${view}${hash}`;
    expect(readWorkspace(source)).toBe('developers');
    const next = workspaceUrl(source, 'developers');
    expect(next.searchParams.getAll('future')).toEqual(['a', 'b']);
    expect(next.hash).toBe(hash); expect(next.searchParams.get('view')).toBe('developers');
    const section = referenceSectionUrl(next.href, 'files');
    expect(new URL(section, 'http://localhost').hash).toBe(hash);
    const browse = workspaceUrl(section, 'browse');
    expect(browse.searchParams.has('section')).toBe(false); expect(browse.searchParams.has('view')).toBe(false);
    expect(routeFromHash(browse.hash)).toEqual({ kind: 'detail', service: 'FILES', name: 'Example', path: 'src/a b.ts', identifier: undefined });
  });
});
