import { useEffect, useState } from 'react';
import { qdnRequest } from './qdnRequest';
import type { QdnResource } from './types';

function filename(resource: QdnResource, properties?: Record<string, unknown>) { return typeof properties?.filename === 'string' ? properties.filename : resource.path || resource.identifier || 'resource'; }
function toText(data: unknown) { return typeof data === 'string' ? data : JSON.stringify(data, null, 2); }
function classify(resource: QdnResource, properties?: Record<string, unknown>) {
  const name = filename(resource, properties).toLowerCase(), mime = String(properties?.mimeType || properties?.mimetype || '').toLowerCase();
  if (resource.service === 'IMAGE' || resource.service === 'THUMBNAIL' || /^image\//.test(mime) || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) return 'image';
  if (resource.service === 'JSON' || mime.includes('json') || name.endsWith('.json')) return 'json';
  if (mime.includes('csv') || name.endsWith('.csv')) return 'csv';
  if (/\.(md|markdown)$/.test(name) || mime.includes('markdown')) return 'markdown';
  if (/^(TEXT|CODE|METADATA|BLOG|BLOG_POST|BLOG_COMMENT|LIST|PLAYLIST|COMMENT|CHAIN_COMMENT|MESSAGE)$/.test(resource.service) || /^text\//.test(mime) || /\.(txt|js|ts|tsx|css|html|xml|yaml|yml|py|java|c|cpp|rs|sh)$/.test(name)) return 'text';
  return 'binary';
}
function csvRows(text: string) { return text.split(/\r?\n/).filter(Boolean).map(row => row.split(',').map(value => value.trim().replace(/^"|"$/g, ''))); }
export function ContentViewer({ resource, properties }: { resource: QdnResource; properties?: Record<string, unknown> }) {
  const [state, setState] = useState<{ data?: string; error?: string; loading: boolean }>({ loading: true });
  const kind = classify(resource, properties);
  useEffect(() => { let active = true; void qdnRequest<unknown>({ action: 'FETCH_QDN_RESOURCE', service: resource.service, name: resource.name, identifier: resource.identifier, path: resource.path, maxBytes: 2 * 1024 * 1024 }).then(data => { if (active) setState({ data: toText(data), loading: false }); }).catch(error => { if (active) setState({ error: error instanceof Error ? error.message : 'Unable to fetch content.', loading: false }); }); return () => { active = false; }; }, [resource.identifier, resource.name, resource.path, resource.service]);
  if (kind === 'binary') return <p className="viewer-note">This resource cannot be rendered safely in Explore. Use Download to save its original bytes.</p>;
  if (state.loading) return <p className="loading">Loading preview…</p>;
  if (state.error) return <p className="error">{state.error}</p>;
  const data = state.data || '';
  if (kind === 'image') return <img className="content-image" alt={filename(resource, properties)} src={`data:${String(properties?.mimeType || 'image/*')};base64,${data}`} />;
  if (kind === 'json') { try { return <pre className="source">{JSON.stringify(JSON.parse(data), null, 2)}</pre>; } catch { return <pre className="source">{data}</pre>; } }
  if (kind === 'csv') { const rows = csvRows(data); return <div className="table-scroll"><table className="csv"><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => i === 0 ? <th key={j}>{cell}</th> : <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>; }
  if (kind === 'markdown') return <article className="markdown">{data.split(/\r?\n/).map((line, index) => line.startsWith('### ') ? <h3 key={index}>{line.slice(4)}</h3> : line.startsWith('## ') ? <h2 key={index}>{line.slice(3)}</h2> : line.startsWith('# ') ? <h1 key={index}>{line.slice(2)}</h1> : <p key={index}>{line}</p>)}</article>;
  return <pre className="source">{data}</pre>;
}
