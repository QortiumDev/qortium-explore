import { describe, expect, it } from 'vitest';
import { mayFetchThumbnail, THUMBNAIL_MAX_BYTES } from './thumbnail';
describe('thumbnail size gate', () => {
  it('fetches only small image resources', () => {
    expect(mayFetchThumbnail({ service: 'IMAGE', size: THUMBNAIL_MAX_BYTES })).toBe(true);
    expect(mayFetchThumbnail({ service: 'IMAGE', size: THUMBNAIL_MAX_BYTES + 1 })).toBe(false);
    expect(mayFetchThumbnail({ service: 'FILE', size: 1 })).toBe(false);
  });
});
