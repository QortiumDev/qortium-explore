const DEFAULT_NODE_API_URL = 'http://127.0.0.1:24891';

export const LOCAL_READ_ACTIONS = [
  'FETCH_NODE_API', 'FETCH_QDN_RESOURCE', 'GET_NODE_STATUS', 'IS_USING_PUBLIC_NODE', 'LIST_QDN_RESOURCES',
  'SEARCH_QDN_RESOURCES', 'GET_QDN_RESOURCE_METADATA', 'GET_QDN_RESOURCE_PROPERTIES', 'GET_QDN_RESOURCE_STATUS',
  'SHOW_ACTIONS', 'WHICH_UI',
] as const;

export type QdnRequest = { action: string; maxBytes?: number; method?: string; path?: string; [key: string]: unknown };
export function getNodeApiUrl() { return (import.meta.env.VITE_QORTIUM_NODE_API_URL || DEFAULT_NODE_API_URL).replace(/\/+$/, ''); }
export function sanitizeNodePath(path: unknown) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\x00-\x1F]/.test(path)) {
    throw new Error('Node API paths must start with /.');
  }
  const url = new URL(path, DEFAULT_NODE_API_URL);
  return `${url.pathname}${url.search}`;
}
export function sanitizeReadMethod(method?: unknown) {
  const normalized = typeof method === 'string' && method.trim() ? method.trim().toUpperCase() : 'GET';
  if (normalized !== 'GET' && normalized !== 'HEAD') throw new Error('Only GET and HEAD node API requests are supported.');
  return normalized;
}
function str(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function queryValue(params: URLSearchParams, key: string, value: unknown) {
  for (const item of Array.isArray(value) ? value : [value]) if (typeof item === 'string' ? item.trim() : typeof item === 'number' || typeof item === 'boolean') params.append(key, String(item).trim());
}
function resourceRequest(request: QdnRequest) {
  const service = str(request.service).toUpperCase(), name = str(request.name), identifier = str(request.identifier), path = str(request.path) || str(request.filepath);
  if (!service || !name) throw new Error('QDN resource service and name are required.');
  return { service, name, identifier, path };
}
function resourcesPath(request: QdnRequest, base: string) {
  const params = new URLSearchParams();
  const fields: Record<string, string> = { default: 'default', description: 'description', exactMatchNames: 'exactmatchnames', excludeBlocked: 'excludeblocked', identifier: 'identifier', includeMetadata: 'includemetadata', includeStatus: 'includestatus', keywords: 'keywords', limit: 'limit', mode: 'mode', name: 'name', names: 'name', offset: 'offset', prefix: 'prefix', query: 'query', reverse: 'reverse', service: 'service', title: 'title' };
  for (const [from, to] of Object.entries(fields)) queryValue(params, to, request[from]);
  return `${base}${params.size ? `?${params}` : ''}`;
}
function resourcePath(request: QdnRequest, kind: 'fetch' | 'metadata' | 'properties' | 'status') {
  const resource = resourceRequest(request), identifier = resource.identifier || 'default';
  if (kind === 'metadata') return `/arbitrary/metadata/${resource.service}/${encodeURIComponent(resource.name)}/${encodeURIComponent(identifier)}`;
  if (kind === 'properties') return `/arbitrary/resource/properties/${resource.service}/${encodeURIComponent(resource.name)}/${encodeURIComponent(identifier)}`;
  if (kind === 'status') return `/arbitrary/resource/status/${resource.service}/${encodeURIComponent(resource.name)}${resource.identifier ? `/${encodeURIComponent(resource.identifier)}` : ''}`;
  const params = new URLSearchParams(); if (resource.path) params.set('filepath', resource.path);
  return `/arbitrary/${resource.service}/${encodeURIComponent(resource.name)}${resource.identifier ? `/${encodeURIComponent(resource.identifier)}` : ''}${params.size ? `?${params}` : ''}`;
}
function parse(body: string, type: string): unknown { try { return type.includes('json') || /^[\s\r\n]*[\[{]/.test(body) ? JSON.parse(body) : body; } catch { return body; } }
async function localData(request: QdnRequest, path: string) {
  const method = sanitizeReadMethod(request.method); const response = await fetch(`${getNodeApiUrl()}${sanitizeNodePath(path)}`, { method });
  const body = method === 'HEAD' ? '' : await response.text();
  if (typeof request.maxBytes === 'number' && request.maxBytes > 0 && new TextEncoder().encode(body).byteLength > request.maxBytes) throw new Error(`Node API response exceeded the ${request.maxBytes.toLocaleString()} byte limit.`);
  if (!response.ok) throw new Error(body || `Node API failed with HTTP ${response.status}.`);
  return parse(body, response.headers.get('content-type') || '');
}
async function fallback<T>(request: QdnRequest): Promise<T> {
  switch (request.action.toUpperCase()) {
    case 'FETCH_NODE_API': return localData(request, sanitizeNodePath(request.path)) as Promise<T>;
    case 'FETCH_QDN_RESOURCE': return localData(request, resourcePath(request, 'fetch')) as Promise<T>;
    case 'GET_QDN_RESOURCE_METADATA': return localData(request, resourcePath(request, 'metadata')) as Promise<T>;
    case 'GET_QDN_RESOURCE_PROPERTIES': return localData(request, resourcePath(request, 'properties')) as Promise<T>;
    case 'GET_QDN_RESOURCE_STATUS': return localData(request, resourcePath(request, 'status')) as Promise<T>;
    case 'GET_NODE_STATUS': return localData(request, '/admin/status') as Promise<T>;
    case 'LIST_QDN_RESOURCES': return localData(request, resourcesPath(request, '/arbitrary/resources')) as Promise<T>;
    case 'SEARCH_QDN_RESOURCES': return localData(request, resourcesPath(request, '/arbitrary/resources/search')) as Promise<T>;
    case 'SHOW_ACTIONS': return Promise.resolve([...LOCAL_READ_ACTIONS] as T);
    case 'WHICH_UI': return Promise.resolve('BROWSER_DEV' as T);
    case 'IS_USING_PUBLIC_NODE': return Promise.resolve(false as T);
    default: throw new Error(`${request.action} is only available inside Qortium Home.`);
  }
}
export function hasHomeBridge() { return typeof window !== 'undefined' && typeof window.qdnRequest === 'function'; }
export async function qdnRequest<T = unknown>(request: QdnRequest): Promise<T> {
  if (!request || typeof request.action !== 'string') throw new Error('QDN requests must include an action.');
  if (typeof window !== 'undefined' && typeof window.qdnRequest === 'function') return window.qdnRequest<T>(request);
  return fallback<T>(request);
}
