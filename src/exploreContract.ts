import type { ExploreRoute } from './appRoute';

export function resourceQuery(route: ExploreRoute) { if (route.kind === 'services') return { action: 'LIST_QDN_RESOURCES', mode: 'ALL', limit: 0 }; if (route.kind === 'service') return { action: 'LIST_QDN_RESOURCES', mode: 'ALL', service: route.service, limit: 0 }; if (route.kind === 'name-services') return { action: 'LIST_QDN_RESOURCES', mode: 'ALL', name: route.name, exactMatchNames: true, limit: 0 }; if (route.kind === 'resources') return { action: 'LIST_QDN_RESOURCES', mode: 'ALL', service: route.service, name: route.name, exactMatchNames: true, includeStatus: true, includeMetadata: true, limit: 0 }; return null; }

export function resourceSearchRequest(query: string, service = '') {
  return { action: 'SEARCH_QDN_RESOURCES', mode: 'ALL', query: query.trim(), service: service || undefined, includeStatus: true, includeMetadata: true, limit: 0 };
}
