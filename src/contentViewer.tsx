import { useEffect, useState } from 'react';
import { qdnRequest } from './qdnRequest';
import { resourceFetchRequest } from './resourceFiles';
import type { QdnResource } from './types';

export const CONTENT_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_MIME_TYPES: Record<string, string> = { avif: 'image/avif', bmp: 'image/bmp', gif: 'image/gif', ico: 'image/x-icon', jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp' };

export type ContentKind = 'binary' | 'csv' | 'image' | 'json' | 'markdown' | 'text';

function filename(resource: QdnResource, properties?: Record<string, unknown>) { return resource.path || (typeof properties?.filename === 'string' ? properties.filename : '') || resource.identifier || 'resource'; }
function extension(name: string) { return name.toLowerCase().split('/').pop()?.split('.').slice(1).pop() ?? ''; }
function toText(data: unknown) { return typeof data === 'string' ? data : JSON.stringify(data, null, 2); }

/**
 * A selected file inside a multi-file resource is classified by its own name.
 * The resource-level service and mime type describe the whole publication, so
 * applying them to one file would mislabel, for example, a PNG inside an APP.
 */
export function classifyContent(resource: QdnResource, properties?: Record<string, unknown>): ContentKind {
  const name = filename(resource, properties).toLowerCase();
  const file = resource.path ? '' : String(properties?.mimeType || properties?.mimetype || '').toLowerCase();
  const service = resource.path ? '' : resource.service;
  if (service === 'IMAGE' || service === 'THUMBNAIL' || /^image\//.test(file) || /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif)$/.test(name)) return 'image';
  if (service === 'JSON' || file.includes('json') || name.endsWith('.json')) return 'json';
  if (file.includes('csv') || name.endsWith('.csv')) return 'csv';
  if (/\.(md|markdown)$/.test(name) || file.includes('markdown')) return 'markdown';
  if (/^(TEXT|CODE|METADATA|BLOG|BLOG_POST|BLOG_COMMENT|LIST|PLAYLIST|COMMENT|CHAIN_COMMENT|MESSAGE)$/.test(service) || /^text\//.test(file) || /\.(txt|js|ts|tsx|css|html|xml|yaml|yml|py|java|c|cpp|rs|sh|map)$/.test(name)) return 'text';
  return 'binary';
}

export function imageMimeType(resource: QdnResource, properties?: Record<string, unknown>) {
  const fromExtension = IMAGE_MIME_TYPES[extension(filename(resource, properties))];
  if (fromExtension) return fromExtension;
  const declared = resource.path ? '' : String(properties?.mimeType || properties?.mimetype || '');
  return /^image\//.test(declared) ? declared : 'image/*';
}

function csvRows(text: string) { return text.split(/\r?\n/).filter(Boolean).map(row => row.split(',').map(value => value.trim().replace(/^"|"$/g, ''))); }

export function ContentViewer({ resource, properties }: { resource: QdnResource; properties?: Record<string, unknown> }) {
  const [state, setState] = useState<{ data?: string; error?: string; loading: boolean }>({ loading: true });
  const kind = classifyContent(resource, properties);
  useEffect(() => {
    if (kind === 'binary') { setState({ loading: false }); return; }
    let active = true;
    setState({ loading: true });
    void qdnRequest<unknown>(resourceFetchRequest(resource, { binary: kind === 'image', maxBytes: CONTENT_MAX_BYTES })).then(data => { if (active) setState({ data: toText(data), loading: false }); }).catch(error => { if (active) setState({ error: error instanceof Error ? error.message : 'Unable to fetch content.', loading: false }); });
    return () => { active = false; };
  }, [kind, resource.identifier, resource.name, resource.path, resource.service]);
  if (kind === 'binary') return <p className="viewer-note">This resource cannot be rendered safely in Explore. Use Download to save its original bytes.</p>;
  if (state.loading) return <p className="loading">Loading preview…</p>;
  if (state.error) return <p className="error">{state.error}</p>;
  const data = state.data || '';
  if (kind === 'image') return <img className="content-image" alt={filename(resource, properties)} src={`data:${imageMimeType(resource, properties)};base64,${data}`} />;
  if (kind === 'json') { try { return <pre className="source">{JSON.stringify(JSON.parse(data), null, 2)}</pre>; } catch { return <pre className="source">{data}</pre>; } }
  if (kind === 'csv') { const rows = csvRows(data); return <div className="table-scroll"><table className="csv"><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => i === 0 ? <th key={j}>{cell}</th> : <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>; }
  if (kind === 'markdown') return <article className="markdown">{data.split(/\r?\n/).map((line, index) => line.startsWith('### ') ? <h3 key={index}>{line.slice(4)}</h3> : line.startsWith('## ') ? <h2 key={index}>{line.slice(3)}</h2> : line.startsWith('# ') ? <h1 key={index}>{line.slice(2)}</h1> : <p key={index}>{line}</p>)}</article>;
  return <pre className="source">{data}</pre>;
}
