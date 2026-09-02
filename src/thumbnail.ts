import type { QdnResource } from './types';
export const THUMBNAIL_MAX_BYTES = 500 * 1024;
export function mayFetchThumbnail(resource: Pick<QdnResource, 'service' | 'size'>) {
  return ['IMAGE', 'THUMBNAIL', 'QCHAT_IMAGE'].includes(resource.service.toUpperCase()) && typeof resource.size === 'number' && resource.size >= 0 && resource.size <= THUMBNAIL_MAX_BYTES;
}

// Base64 alphabet only, padded to a multiple of 4 chars, and bounded to what
// THUMBNAIL_MAX_BYTES of raw bytes can encode to — rejects anything that
// isn't a plausible base64-encoded thumbnail before it ever reaches atob().
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const THUMBNAIL_MAX_BASE64_LENGTH = Math.ceil(THUMBNAIL_MAX_BYTES / 3) * 4;

// Decodes a Home-supplied base64 thumbnail payload to raw bytes, or returns
// null if it doesn't look like valid base64 / exceeds the size bound. Callers
// hand the bytes to Blob + URL.createObjectURL rather than a data: URI, so an
// untrusted string is never reinterpreted directly as an <img> src.
export function decodeThumbnailBytes(data: string): Uint8Array<ArrayBuffer> | null {
  if (typeof data !== 'string' || !data || data.length > THUMBNAIL_MAX_BASE64_LENGTH || data.length % 4 !== 0 || !BASE64_PATTERN.test(data)) return null;
  try {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}
