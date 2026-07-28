import type { QdnResource } from './types';

export const MAX_RESOURCE_FILES = 5_000;
export const MAX_RESOURCE_FILE_PATH_LENGTH = 1_024;

/**
 * Core's arbitrary metadata lists the contents of a multi-file resource. That
 * list is published data, so it is untrusted input here: every entry is used to
 * build a node `filepath` query and an Explore route. Reject absolute paths,
 * traversal, backslashes, and control characters rather than passing them on.
 */
export function resourceFiles(metadata: unknown): string[] {
  const files = (metadata as { files?: unknown } | null | undefined)?.files;

  if (!Array.isArray(files)) return [];

  const paths = new Set<string>();

  for (const entry of files) {
    if (typeof entry !== 'string') continue;

    const path = entry.trim();

    if (!path || path.length > MAX_RESOURCE_FILE_PATH_LENGTH) continue;
    if (path.startsWith('/') || path.includes('\\')) continue;
    if (/(^|\/)\.\.(\/|$)/.test(path) || /[\u0000-\u001F\u007F]/.test(path)) continue;

    paths.add(path);

    if (paths.size >= MAX_RESOURCE_FILES) break;
  }

  return [...paths].sort((left, right) => left.localeCompare(right));
}

export type ResourceFetchRequest = {
  action: 'FETCH_QDN_RESOURCE';
  encoding?: 'base64';
  identifier?: string;
  maxBytes: number;
  name: string;
  path?: string;
  service: string;
};

/**
 * Both Home's bridge and the browser fallback read the node response as text,
 * so raw bytes arrive corrupted. Anything that is not decoded as text must ask
 * Core for base64 instead of re-encoding a mangled string in the app.
 */
export function resourceFetchRequest(
  resource: Pick<QdnResource, 'identifier' | 'name' | 'path' | 'service'>,
  options: { binary?: boolean; maxBytes: number },
): ResourceFetchRequest {
  return {
    action: 'FETCH_QDN_RESOURCE',
    service: resource.service,
    name: resource.name,
    identifier: resource.identifier,
    path: resource.path,
    maxBytes: options.maxBytes,
    ...(options.binary ? { encoding: 'base64' as const } : {}),
  };
}
