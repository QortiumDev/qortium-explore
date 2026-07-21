import type { QdnResource } from './types';
export const THUMBNAIL_MAX_BYTES = 500 * 1024;
export function mayFetchThumbnail(resource: Pick<QdnResource, 'service' | 'size'>) {
  return ['IMAGE', 'THUMBNAIL', 'QCHAT_IMAGE'].includes(resource.service.toUpperCase()) && typeof resource.size === 'number' && resource.size >= 0 && resource.size <= THUMBNAIL_MAX_BYTES;
}
