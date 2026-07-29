import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ContentViewer } from './contentViewer';
import { detailRoute, hashForRoute, routeFromHash, singleResourceDetailRoute, type ExploreRoute } from './appRoute';
import { applyDisplaySettings, getInitialDisplaySettings, updateFromHostMessage } from './displaySettings';
import { dispatchOpen } from './dispatcher';
import { GitRepositoryViewer } from './GitRepositoryViewer';
import { createTranslator } from './i18n';
import { detectGitRepositoryLayout } from './qdnGitRepository';
import { NameOwnerIdentity } from './NameOwnerIdentity';
import { hasHomeBridge, qdnRequest } from './qdnRequest';
import {
  canStreamResource,
  resourceBridgeCapabilities,
  resourceStreamRequest,
  type ResourceBridgeCapabilities,
} from './resourceBridge';
import { loadResourceDetails } from './resourceDetails';
import { resourceFetchRequest, resourceFiles } from './resourceFiles';
import { isBrowserArchiveService, PUBLIC_QDN_SERVICES } from './services';
import { sortRows, type Sort, updatedOf } from './sort';
import { previewQdnPublishSource, supportsSourcePreview } from './sourcePreview';
import { mayFetchThumbnail, THUMBNAIL_MAX_BYTES } from './thumbnail';
import type { QdnResource, ResourceDetails } from './types';

type Folder = { count: number; name: string; updated: number };
const defaultSort: Sort = { key: 'updated', direction: 'desc' };
const asResources = (value: unknown): QdnResource[] => Array.isArray(value) ? value.filter((row): row is QdnResource => !!row && typeof row === 'object' && typeof (row as QdnResource).service === 'string' && PUBLIC_QDN_SERVICES.includes((row as QdnResource).service as (typeof PUBLIC_QDN_SERVICES)[number]) && typeof (row as QdnResource).name === 'string') : [];
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Could not load QDN resources.';
const bytes = (size?: number) => typeof size === 'number' ? size < 1024 ? `${size} B` : size < 1024 ** 2 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 ** 2).toFixed(1)} MB` : '—';
const date = (timestamp?: number) => timestamp ? new Date(timestamp).toLocaleString() : '—';
function groupBy<T extends string>(resources: QdnResource[], key: (item: QdnResource) => T): Folder[] { const map = new Map<T, Folder>(); for (const resource of resources) { const name = key(resource), old = map.get(name); map.set(name, { name, count: (old?.count ?? 0) + 1, updated: Math.max(old?.updated ?? 0, updatedOf(resource)) }); } return [...map.values()]; }
function resourceQuery(route: ExploreRoute) { if (route.kind === 'services') return { action: 'LIST_QDN_RESOURCES', mode: 'ALL', limit: 0 }; if (route.kind === 'service') return { action: 'LIST_QDN_RESOURCES', mode: 'ALL', service: route.service, limit: 0 }; if (route.kind === 'name-services') return { action: 'LIST_QDN_RESOURCES', mode: 'ALL', name: route.name, exactMatchNames: true, limit: 0 }; if (route.kind === 'resources') return { action: 'LIST_QDN_RESOURCES', mode: 'ALL', service: route.service, name: route.name, exactMatchNames: true, includeStatus: true, includeMetadata: true, limit: 0 }; return null; }

function Thumbnail({ resource, streamUrlSupported }: { resource: QdnResource; streamUrlSupported: boolean | null }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    if (!mayFetchThumbnail(resource) || streamUrlSupported === null) return;
    let active = true;
    const load = async () => {
      if (streamUrlSupported && canStreamResource(resource)) {
        try {
          const streamUrl = await qdnRequest<unknown>(resourceStreamRequest(resource));
          if (typeof streamUrl === 'string' && streamUrl) {
            if (active) setSrc(streamUrl);
            return;
          }
        } catch {
          // A newly advertised stream URL can still fail transiently. Retain
          // Explore's bounded base64 thumbnail path as the compatibility fallback.
        }
      }
      const data = await qdnRequest<unknown>(resourceFetchRequest(resource, { binary: true, maxBytes: THUMBNAIL_MAX_BYTES }));
      if (active && typeof data === 'string') setSrc(`data:image/*;base64,${data}`);
    };
    void load().catch(() => undefined);
    return () => { active = false; };
  }, [resource.identifier, resource.name, resource.path, resource.service, resource.size, streamUrlSupported]);
  return src ? <img className="thumbnail" alt="" decoding="async" loading="lazy" src={src} /> : <span className="thumbnail thumbnail--placeholder" aria-label="Preview unavailable">▧</span>;
}
function SortButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) { return <button className="sort" type="button" onClick={onClick}>{children}{active ? ' ↕' : ''}</button>; }

export function App() {
  const [route, setRoute] = useState<ExploreRoute>(() => routeFromHash(window.location.hash));
  const [display, setDisplay] = useState(getInitialDisplaySettings);
  const [resources, setResources] = useState<QdnResource[]>([]); const [loading, setLoading] = useState(false); const [failure, setFailure] = useState(''); const [refresh, setRefresh] = useState(0); const [sort, setSort] = useState<Sort>(defaultSort);
  const [search, setSearch] = useState(''); const [searchService, setSearchService] = useState(''); const [searchResults, setSearchResults] = useState<QdnResource[] | null>(null); const [searchLoading, setSearchLoading] = useState(false);
  const [details, setDetails] = useState<ResourceDetails | null>(null);
  const [gitFallback, setGitFallback] = useState('');
  const [previewing, setPreviewing] = useState(false); const [previewMessage, setPreviewMessage] = useState(''); const [previewFailure, setPreviewFailure] = useState('');
  const [sourcePreviewSupported, setSourcePreviewSupported] = useState(false);
  const [resourceBridge, setResourceBridge] = useState<ResourceBridgeCapabilities>({ resourceViewer: false, streamUrl: false });
  const [resourceBridgeReady, setResourceBridgeReady] = useState(false);
  const t = useMemo(() => createTranslator(display.language), [display.language]);
  const navigate = (next: ExploreRoute) => { window.location.hash = hashForRoute(next); };
  const replace = (next: ExploreRoute) => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hashForRoute(next)}`);
    setRoute(next);
  };
  useEffect(() => { const onHash = () => setRoute(routeFromHash(window.location.hash)); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash); }, []);
  useEffect(() => { applyDisplaySettings(display); const onMessage = (event: MessageEvent) => setDisplay(current => updateFromHostMessage(event.data, current) ?? current); window.addEventListener('message', onMessage); return () => window.removeEventListener('message', onMessage); }, [display]);
  useEffect(() => {
    let active = true;
    void qdnRequest<unknown>({ action: 'SHOW_ACTIONS' }).then(actions => {
      if (!active) return;
      setSourcePreviewSupported(hasHomeBridge() && supportsSourcePreview(actions));
      setResourceBridge(resourceBridgeCapabilities(actions));
      setResourceBridgeReady(true);
    }).catch(() => {
      if (!active) return;
      setSourcePreviewSupported(false);
      setResourceBridge({ resourceViewer: false, streamUrl: false });
      setResourceBridgeReady(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => { const request = resourceQuery(route); if (!request) return; let active = true; setLoading(true); setFailure(''); void qdnRequest<unknown>(request).then(value => { if (!active) return; const nextResources = asResources(value); const detail = singleResourceDetailRoute(route, nextResources); if (detail) { replace(detail); return; } setResources(nextResources); }).catch(error => { if (active) setFailure(errorText(error)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [route, refresh]);
  useEffect(() => { setGitFallback(''); if (route.kind !== 'detail') { setDetails(null); return; } let active = true; setDetails(null); setFailure(''); const resource = { service: route.service, name: route.name, identifier: route.identifier }; void loadResourceDetails(qdnRequest, resource).then(value => { if (active) setDetails(value); }).catch(error => { if (active) setFailure(errorText(error)); }); return () => { active = false; }; }, [route]);
  const folders = useMemo(() => route.kind === 'services' ? groupBy(resources, item => item.service) : route.kind === 'service' ? groupBy(resources, item => item.name) : route.kind === 'name-services' ? groupBy(resources, item => item.service) : [], [resources, route]);
  const shown = searchResults ?? (route.kind === 'resources' ? resources : []);
  const sortedFolders = sortRows(folders, sort, (row, key) => key === 'count' ? row.count : key === 'updated' ? row.updated : row.name);
  const sortedResources = sortRows(shown, sort, (row, key) => key === 'identifier' ? row.identifier || 'default' : key === 'status' ? row.status?.status || 'PUBLISHED' : key === 'size' ? row.size || 0 : key === 'updated' ? updatedOf(row) : row.identifier || 'default');
  const toggle = (key: Sort['key']) => setSort(current => ({ key, direction: current.key === key ? current.direction === 'asc' ? 'desc' : 'asc' : ['identifier', 'status', 'name'].includes(key) ? 'asc' : 'desc' }));
  const doSearch = () => { const query = search.trim(); if (!query) { setSearchResults(null); return; } setSearchLoading(true); void qdnRequest<unknown>({ action: 'SEARCH_QDN_RESOURCES', mode: 'ALL', query, service: searchService || undefined, includeStatus: true, includeMetadata: true, limit: 0 }).then(value => setSearchResults(asResources(value))).catch(error => setFailure(errorText(error))).finally(() => setSearchLoading(false)); };
  const previewLocalFile = () => { setPreviewing(true); setPreviewMessage(''); setPreviewFailure(''); void previewQdnPublishSource(qdnRequest).then(result => setPreviewMessage(result.kind === 'canceled' ? t('preview.canceled') : t('preview.opened'))).catch(error => setPreviewFailure(errorText(error))).finally(() => setPreviewing(false)); };
  const detailResource: QdnResource | null = route.kind === 'detail' ? { service: route.service, name: route.name, identifier: route.identifier } : null;
  if (route.kind === 'detail' && detailResource) {
    const files = resourceFiles(details?.metadata);
    const selected = files.includes(route.path ?? '') ? route.path : undefined;
    const viewed = { ...detailResource, path: selected };
    const file = selected || (typeof details?.properties?.filename === 'string' ? details.properties.filename : undefined);
    const mime = selected ? undefined : typeof details?.properties?.mimeType === 'string' ? details.properties.mimeType : undefined;
    const open = dispatchOpen(viewed, {
      filename: file,
      mimeType: mime,
      resourceViewer: resourceBridge.resourceViewer,
    });
    const opensInHomeViewer = open.action === 'OPEN_QDN_DOCUMENT_VIEWER' || open.action === 'OPEN_QDN_MEDIA_PLAYER' || open.action === 'OPEN_QDN_RESOURCE_VIEWER';
    const showFiles = files.length > 1;
    const showGit = !selected && !gitFallback && !!detectGitRepositoryLayout(files);
    return <main className="app"><header className="top"><div><h1>{t('app.title')}</h1><p>{detailResource.service} / {detailResource.name} / {detailResource.identifier || 'default'}{selected ? ` / ${selected}` : ''}</p><NameOwnerIdentity key={detailResource.name} language={display.language} name={detailResource.name} /></div><button onClick={() => history.back()}>{t('action.back')}</button></header><section className="detail"><div className="detail-actions">{open.action === 'INTERNAL_VIEWER' ? null : <button onClick={() => void qdnRequest(open).catch(error => setFailure(errorText(error)))}>{t('action.open')}</button>}{isBrowserArchiveService(detailResource.service) ? <button onClick={() => void qdnRequest(dispatchOpen(detailResource, { newTab: true })).catch(error => setFailure(errorText(error)))}>{t('action.openNewTab')}</button> : null}<button onClick={() => void qdnRequest({ action: 'SAVE_QDN_RESOURCE', ...viewed, filename: file }).catch(error => setFailure(errorText(error)))}>{t('action.download')}</button></div>{failure ? <p className="error">{failure}</p> : null}<div className="detail-grid"><section><h2>{t('label.details')}</h2><dl><dt>{t('label.title')}</dt><dd>{String(details?.metadata?.title || '—')}</dd><dt>{t('label.description')}</dt><dd>{String(details?.metadata?.description || '—')}</dd><dt>{t('label.status')}</dt><dd>{String(details?.status?.status || '—')}</dd><dt>{t('column.size')}</dt><dd>{bytes(details?.status?.size)}</dd><dt>{t('column.updated')}</dt><dd>{date(details?.status?.updated)}</dd></dl>{showFiles ? <><h3>{t('label.files')} <small>{files.length.toLocaleString()}</small></h3><div className="file-list">{files.map(path => <button className={`file-row${path === selected ? ' file-row--active' : ''}`} key={path} type="button" onClick={() => navigate({ ...route, path })}>{path}</button>)}</div></> : null}<h3>{t('label.properties')}</h3><pre className="source">{JSON.stringify(details?.properties || {}, null, 2)}</pre></section><section><h2>{showGit ? t('git.title') : selected || (opensInHomeViewer ? t('viewer.preview') : t('viewer.source'))}</h2>{selected ? <button className="file-clear" type="button" onClick={() => navigate({ ...route, path: undefined })}>{t('action.allFiles')}</button> : null}{gitFallback ? <p className="viewer-note">{gitFallback}</p> : null}{showGit ? <GitRepositoryViewer key={`${detailResource.service}/${detailResource.name}/${detailResource.identifier || ''}`} files={files} language={display.language} onFallback={setGitFallback} resource={detailResource} /> : showFiles && !selected ? <p className="viewer-note">{t('viewer.selectFile')}</p> : <ContentViewer key={selected ?? ''} resource={viewed} properties={details?.properties} binaryMessage={opensInHomeViewer ? t('viewer.openInHome') : undefined} streamUrlSupported={resourceBridgeReady ? resourceBridge.streamUrl : null} />}</section></div></section></main>;
  }
  return <main className="app"><header className="top"><div><h1>{t('app.title')}</h1><p>{t('app.subtitle')} <small>{__APP_VERSION__}</small></p></div><div className="top-actions">{sourcePreviewSupported ? <button disabled={previewing} onClick={previewLocalFile}>{previewing ? t('preview.choosing') : t('action.preview')}</button> : null}<button disabled={loading} onClick={() => setRefresh(value => value + 1)}>{t('action.refresh')}</button></div></header>{previewMessage ? <p className="preview-status" aria-live="polite">{previewMessage}</p> : null}{previewFailure ? <p className="error" role="alert">{previewFailure}</p> : null}<section className="search"><input aria-label={t('field.query')} value={search} placeholder={t('field.query')} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') doSearch(); }} /><select aria-label={t('field.service')} value={searchService} onChange={event => setSearchService(event.target.value)}><option value="">{t('field.service')}</option>{PUBLIC_QDN_SERVICES.map(service => <option key={service}>{service}</option>)}</select><button disabled={searchLoading} onClick={doSearch}>{t('action.search')}</button>{searchResults ? <button onClick={() => { setSearch(''); setSearchResults(null); }}>{t('action.back')}</button> : null}</section><p className="crumb">{route.kind === 'services' ? 'QDN' : route.kind === 'service' ? route.service : route.kind === 'name-services' ? route.name : `${route.service} / ${route.name}`}</p>{failure ? <section className="error-box"><strong>{t('error.coreOffline')}</strong><p>{failure}</p><button onClick={() => setRefresh(value => value + 1)}>{t('action.retry')}</button></section> : null}{loading && !resources.length ? <p className="loading">{t('loading')}</p> : null}{!searchResults && folders.length > 0 ? <section className="list"><div className="head"><span>{t('label.name')}</span><SortButton active={sort.key === 'count'} onClick={() => toggle('count')}>{t('column.count')}</SortButton><SortButton active={sort.key === 'updated'} onClick={() => toggle('updated')}>{t('column.updated')}</SortButton></div>{sortedFolders.map(row => <button className="row folder" key={row.name} onClick={() => navigate(route.kind === 'services' ? { kind: 'service', service: row.name } : route.kind === 'service' ? { kind: 'resources', service: route.service, name: row.name } : { kind: 'resources', service: row.name, name: route.name })}><span>▸ {row.name}</span><span>{row.count.toLocaleString()}</span><span>{date(row.updated)}</span></button>)}</section> : null}{(searchResults || route.kind === 'resources') && <section className="list"><div className="head resources"><span aria-hidden="true" /><SortButton active={sort.key === 'identifier'} onClick={() => toggle('identifier')}>{t('column.identifier')}</SortButton><SortButton active={sort.key === 'status'} onClick={() => toggle('status')}>{t('column.status')}</SortButton><SortButton active={sort.key === 'size'} onClick={() => toggle('size')}>{t('column.size')}</SortButton><SortButton active={sort.key === 'updated'} onClick={() => toggle('updated')}>{t('column.updated')}</SortButton></div>{sortedResources.map(resource => <button className="row resource" key={`${resource.service}/${resource.name}/${resource.identifier || ''}`} onClick={() => navigate(detailRoute(resource))}><Thumbnail resource={resource} streamUrlSupported={resourceBridgeReady ? resourceBridge.streamUrl : null} /><span><strong>{resource.identifier || 'default'}</strong><small>{resource.service} · {resource.name}</small></span><span>{resource.status?.status || 'PUBLISHED'}</span><span>{bytes(resource.size)}</span><span>{date(updatedOf(resource))}</span></button>)}</section>}{!loading && !failure && ((searchResults && !searchResults.length) || (!searchResults && !folders.length && route.kind !== 'resources') || (route.kind === 'resources' && !resources.length)) ? <p className="empty">{searchResults ? t('empty.search') : t('empty.resources')}</p> : null}</main>;
}
