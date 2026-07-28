import { isBrowserArchiveService } from './services';
import type { QdnResource } from './types';

export type OpenDispatch =
  | { action: 'OPEN_CURRENT_TAB' | 'OPEN_NEW_TAB'; address: string }
  | { action: 'OPEN_QDN_MEDIA_PLAYER'; identifier?: string; name: string; path?: string; service: string }
  | { action: 'OPEN_QDN_DOCUMENT_VIEWER'; filename?: string; identifier?: string; mimeType?: string; name: string; path?: string; service: string }
  | { action: 'INTERNAL_VIEWER' };
const media = new Set(['AUDIO', 'VOICE', 'PODCAST', 'VIDEO']);
const documents = new Set(['DOCUMENT', 'FILE', 'FILES', 'ATTACHMENT']);
export function qdnUrl(resource: Pick<QdnResource, 'service' | 'name' | 'identifier'>) {
  return `qdn://${resource.service}/${encodeURIComponent(resource.name)}${resource.identifier ? `/${encodeURIComponent(resource.identifier)}` : ''}`;
}
export function dispatchOpen(resource: QdnResource, options: { newTab?: boolean; filename?: string; mimeType?: string } = {}): OpenDispatch {
  const service = resource.service.toUpperCase();
  if (isBrowserArchiveService(service)) return { action: options.newTab ? 'OPEN_NEW_TAB' : 'OPEN_CURRENT_TAB', address: qdnUrl({ ...resource, service }) };
  if (media.has(service)) return { action: 'OPEN_QDN_MEDIA_PLAYER', service, name: resource.name, identifier: resource.identifier, path: resource.path };
  if (documents.has(service)) return { action: 'OPEN_QDN_DOCUMENT_VIEWER', service, name: resource.name, identifier: resource.identifier, path: resource.path, filename: options.filename, mimeType: options.mimeType };
  return { action: 'INTERNAL_VIEWER' };
}
