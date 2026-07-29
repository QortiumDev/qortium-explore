import { describe, expect, it } from 'vitest';
import { PreviewCache, previewCacheKey } from './previewCache';

describe('PreviewCache', () => {
  it('keeps recently used previews and evicts the least recently used entry', () => {
    const cache = new PreviewCache(2, 100);
    cache.set('first', 'one');
    cache.set('second', 'two');
    expect(cache.get('first')).toBe('one');
    cache.set('third', 'three');
    expect(cache.get('second')).toBeUndefined();
    expect(cache.get('first')).toBe('one');
    expect(cache.get('third')).toBe('three');
  });

  it('does not retain a preview larger than the byte budget', () => {
    const cache = new PreviewCache(2, 4);
    cache.set('large', 'abc');
    expect(cache.get('large')).toBeUndefined();
  });

  it('keys previews by the complete resource and selected path', () => {
    expect(previewCacheKey({ service: 'IMAGE', name: 'alice', identifier: 'photo', path: 'one.png' }, 'image'))
      .not.toBe(previewCacheKey({ service: 'IMAGE', name: 'alice', identifier: 'photo', path: 'two.png' }, 'image'));
  });
});
