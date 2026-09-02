import { describe, expect, it } from 'vitest';
import { decodeThumbnailBytes, mayFetchThumbnail, THUMBNAIL_MAX_BYTES } from './thumbnail';
describe('thumbnail size gate', () => {
  it('fetches only small image resources', () => {
    expect(mayFetchThumbnail({ service: 'IMAGE', size: THUMBNAIL_MAX_BYTES })).toBe(true);
    expect(mayFetchThumbnail({ service: 'IMAGE', size: THUMBNAIL_MAX_BYTES + 1 })).toBe(false);
    expect(mayFetchThumbnail({ service: 'FILE', size: 1 })).toBe(false);
  });
});
describe('thumbnail base64 decoding', () => {
  it('decodes a valid base64 payload to its raw bytes', () => {
    // A minimal 1x1 transparent PNG, base64-encoded.
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const decoded = decodeThumbnailBytes(png);
    expect(decoded).not.toBeNull();
    // PNG magic bytes.
    expect(Array.from(decoded!.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it('rejects payloads that are not base64', () => {
    expect(decodeThumbnailBytes('<script>alert(1)</script>')).toBeNull();
    expect(decodeThumbnailBytes('not base64 at all!')).toBeNull();
    expect(decodeThumbnailBytes('')).toBeNull();
  });

  it('rejects payloads longer than THUMBNAIL_MAX_BYTES can encode', () => {
    const tooLong = 'A'.repeat(Math.ceil(THUMBNAIL_MAX_BYTES / 3) * 4 + 4);
    expect(decodeThumbnailBytes(tooLong)).toBeNull();
  });
});
