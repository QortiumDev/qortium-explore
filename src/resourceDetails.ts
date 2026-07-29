import type { QdnRequest } from './qdnRequest';
import type { ResourceDetails } from './types';

type Request = (request: QdnRequest) => Promise<unknown>;

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Could not load resource details.';
}

export async function loadResourceDetails(
  request: Request,
  resource: { service: string; name: string; identifier?: string },
): Promise<ResourceDetails> {
  const [metadataResult, statusResult] = await Promise.allSettled([
    request({ action: 'GET_QDN_RESOURCE_METADATA', ...resource }),
    request({ action: 'GET_QDN_RESOURCE_STATUS', ...resource }),
  ]);
  if (metadataResult.status === 'rejected' && statusResult.status === 'rejected') {
    throw new Error(errorMessage(statusResult.reason || metadataResult.reason));
  }

  const metadata = metadataResult.status === 'fulfilled' && metadataResult.value && typeof metadataResult.value === 'object'
    ? metadataResult.value as Record<string, unknown>
    : undefined;
  const status = statusResult.status === 'fulfilled' && statusResult.value && typeof statusResult.value === 'object'
    ? statusResult.value as ResourceDetails['status']
    : undefined;
  let properties: Record<string, unknown> | undefined;

  // Core's properties endpoint can initiate a download and return a temporary
  // 1401 while ContentViewer is already fetching the same resource. Only ask
  // for optional presentation hints once Core says the resource is ready.
  if (status?.status === 'READY' || status?.status === 'DOWNLOADED') {
    try {
      const value = await request({ action: 'GET_QDN_RESOURCE_PROPERTIES', ...resource });
      properties = value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
    } catch {
      // Filename and MIME hints are optional; a miss must not poison a usable
      // status, metadata response, or preview.
    }
  }

  return { metadata, status, properties };
}
