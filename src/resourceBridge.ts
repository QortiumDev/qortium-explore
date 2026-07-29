import type { QdnRequest } from './qdnRequest';
import type { QdnResource } from './types';

export const OPEN_QDN_RESOURCE_VIEWER = 'OPEN_QDN_RESOURCE_VIEWER';
export const GET_QDN_RESOURCE_STREAM_URL = 'GET_QDN_RESOURCE_STREAM_URL';

const STREAMABLE_SERVICES = new Set([
  'IMAGE',
  'THUMBNAIL',
  'QCHAT_IMAGE',
  'AUDIO',
  'VOICE',
  'PODCAST',
  'VIDEO',
  'DOCUMENT',
  'FILE',
  'FILES',
  'ATTACHMENT',
]);

export type ResourceBridgeCapabilities = {
  resourceViewer: boolean;
  streamUrl: boolean;
};

export function resourceBridgeCapabilities(actions: unknown): ResourceBridgeCapabilities {
  const actionSet = new Set(
    Array.isArray(actions)
      ? actions.filter((action): action is string => typeof action === 'string')
      : [],
  );

  return {
    resourceViewer: actionSet.has(OPEN_QDN_RESOURCE_VIEWER),
    streamUrl: actionSet.has(GET_QDN_RESOURCE_STREAM_URL),
  };
}

export function canStreamResource(resource: Pick<QdnResource, 'service'>) {
  return STREAMABLE_SERVICES.has(resource.service.toUpperCase());
}

export function resourceStreamRequest(
  resource: Pick<QdnResource, 'service' | 'name' | 'identifier' | 'path'>,
  hints: { filename?: string; mimeType?: string } = {},
): QdnRequest {
  return {
    action: GET_QDN_RESOURCE_STREAM_URL,
    service: resource.service.toUpperCase(),
    name: resource.name,
    ...(resource.identifier ? { identifier: resource.identifier } : {}),
    ...(resource.path ? { path: resource.path } : {}),
    ...(hints.filename ? { filename: hints.filename } : {}),
    ...(hints.mimeType ? { mimeType: hints.mimeType } : {}),
  };
}
