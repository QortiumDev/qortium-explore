import type { QdnResource } from './types';

export type ExploreRoute =
  | { kind: 'services' }
  | { kind: 'service'; service: string }
  | { kind: 'name-services'; name: string }
  | { kind: 'resources'; name: string; service: string }
  | { kind: 'detail'; identifier?: string; name: string; service: string };

function decode(value: string) { try { return decodeURIComponent(value); } catch { return value; } }
function encode(value: string) { return encodeURIComponent(value); }

export function routeFromHash(hash: string): ExploreRoute {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decode);
  if (parts[0] === 'service' && parts[1]) return { kind: 'service', service: parts[1].toUpperCase() };
  if (parts[0] === 'name' && parts[1] && parts[2] === 'services') return { kind: 'name-services', name: parts[1] };
  if (parts[0] === 'resource' && parts[1] && parts[2]) return { kind: 'resources', service: parts[1].toUpperCase(), name: parts[2] };
  if (parts[0] === 'detail' && parts[1] && parts[2]) return { kind: 'detail', service: parts[1].toUpperCase(), name: parts[2], identifier: parts[3] };
  return { kind: 'services' };
}

export function hashForRoute(route: ExploreRoute) {
  if (route.kind === 'service') return `#/service/${encode(route.service)}`;
  if (route.kind === 'name-services') return `#/name/${encode(route.name)}/services`;
  if (route.kind === 'resources') return `#/resource/${encode(route.service)}/${encode(route.name)}`;
  if (route.kind === 'detail') return `#/detail/${encode(route.service)}/${encode(route.name)}${route.identifier ? `/${encode(route.identifier)}` : ''}`;
  return '#/services';
}

export function detailRoute(resource: QdnResource): ExploreRoute {
  return { kind: 'detail', service: resource.service, name: resource.name, identifier: resource.identifier };
}
