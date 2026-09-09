import { useState } from 'react';
import { copyTextToClipboard } from './clipboard';
import { ReferenceNavigation } from './ReferenceNavigation';
import { resourceQuery, resourceSearchRequest } from './exploreContract';
import { resourceFetchRequest, MAX_RESOURCE_FILES, MAX_RESOURCE_FILE_PATH_LENGTH } from './resourceFiles';
import { CONTENT_MAX_BYTES, STREAM_IMAGE_MIME_TYPES } from './contentViewer';
import { THUMBNAIL_MAX_BYTES } from './thumbnail';
import { AVATAR_MAX_BYTES } from './avatarClient';
import { MAX_ENTRIES, MAX_BYTES } from './previewCache';
import { MAX_REPOSITORY_PATHS, MAX_PATH_BYTES, MAX_GIT_FILE_BYTES, MAX_CACHED_BYTES, MAX_GIT_HISTORY_DEPTH } from './qdnGitRepository';
import { SOURCE_PREVIEW_ACTIONS } from './sourcePreview';
import { PUBLIC_QDN_SERVICES, isBrowserArchiveService } from './services';
import { resourceStreamRequest } from './resourceBridge';
import { dispatchOpen } from './dispatcher';

const exampleResource = { service: 'APP', name: 'Explore', identifier: 'Explore' };
const json = (value: unknown) => JSON.stringify(value, null, 2);
export const REFERENCE_SNIPPETS = {
  discovery: `const resources = await qdnRequest(${json(resourceQuery({ kind: 'resources', service: 'APP', name: 'Explore' }))});
const matches = await qdnRequest(${json(resourceSearchRequest('Explore', 'APP'))});
// These actions return resource arrays. Validate rows before using them.
// limit: 0 is Explore's current request; host limits still apply.`,
  details: `const resource = ${json(exampleResource)};
const [metadata, status] = await Promise.allSettled([
  qdnRequest({ action: 'GET_QDN_RESOURCE_METADATA', ...resource }),
  qdnRequest({ action: 'GET_QDN_RESOURCE_STATUS', ...resource }),
]);
// Independent reads: one failure does not erase the other result.
// Properties are optional hints; Explore requests them after READY/DOWNLOADED.`,
  file: `const manifest = await qdnRequest(${json(resourceFetchRequest({ ...exampleResource, path: 'qortium-app.json' }, { maxBytes: CONTENT_MAX_BYTES }))});
// FETCH_QDN_RESOURCE returns payload data, not an HTTP envelope.
// For binary content use encoding: 'base64', then validate/decode it.
// maxBytes bounds the response; base64 overhead can reduce usable raw bytes.`,
  viewers: `const actions = await qdnRequest({ action: 'SHOW_ACTIONS' });
const available = new Set(Array.isArray(actions) ? actions : []);
// Example plans only; invoke an Open request after a user gesture.
const appRequest = ${json(dispatchOpen(exampleResource, { newTab: true }))};
const fileRequest = ${json(dispatchOpen({ service: 'FILE', name: 'Example', identifier: 'manual' }, { resourceViewer: true, filename: 'manual.pdf' }))};
// Check OPEN_QDN_RESOURCE_VIEWER before using fileRequest.
// Older hosts may offer document/media actions instead.`,
  stream: `// Define a read operation; copying does not start it.
async function requestMediaUrl() {
  return qdnRequest(${json(resourceStreamRequest({ service: 'AUDIO', name: 'Example', identifier: 'sample' }, { filename: 'sample.mp3' }))});
}
// Feature-detect GET_QDN_RESOURCE_STREAM_URL. Treat returned URLs as
// temporary host capabilities; do not persist/share them or put them in QDN.
// Explore accepts credential-free HTTP(S) or the exact Home 2 desktop
// qortium-home-resource://stream/UUID capability; it revokes image blob URLs.`,
  localPreview: `// Define an operation; invoke only from a user's preview action.
async function previewLocalFile() {
  const selection = await qdnRequest({ action: 'SELECT_QDN_PUBLISH_SOURCE', kind: 'file' });
  if (selection.canceled) return;
  if (!selection.sourceToken) throw new Error('No selected-source token');
  const opened = await qdnRequest({ action: 'PREVIEW_QDN_PUBLISH_SOURCE', sourceToken: selection.sourceToken });
  if (opened !== true) throw new Error('Preview was not opened');
}
// kind: 'directory' requests a folder. Home/platform support may vary.
// No PUBLISH_QDN_RESOURCE request is made. Do not persist/log sourceToken.`,
} as const;

export function Reference() {
  const [copied, setCopied] = useState('');
  async function copy(key: string, text: string, button: HTMLButtonElement) {
    setCopied(await copyTextToClipboard(text) ? key : 'unavailable');
    button.focus({ preventScroll: true });
  }
  return <article className="reference" aria-label="Explore developer reference" lang="en" dir="ltr">
    <header className="reference-header"><h2>Developers</h2><p>Explore {__APP_VERSION__}: public Qortium QDN discovery, files and viewers.</p><ReferenceNavigation />
      <p className="copy-status" role="status" aria-live="polite">{copied === 'unavailable' ? 'Clipboard unavailable. Select the code and copy it manually.' : copied ? `Copied ${copied} example.` : 'Code examples can be selected for manual copying.'}</p>
    </header>
    <div className="reference-scroll">
      <section id="reference-contract" tabIndex={-1}><h3>Host and resources</h3>
        <p>Explore is published on Qortium as <code>APP/Explore/Explore</code>. It browses public Qortium QDN resources using the node selected by Home. This reference adds no Qortal integration, account authority or publishing permission.</p>
        <p>A resource is identified by <code>service / registered name / optional identifier</code>. A file path selects content inside that resource; it is not another identifier. Missing identifiers use Core’s default-resource convention. Resource metadata, names and filenames are untrusted published data. A current tuple can resolve to an updated publication: it is not a pinned content hash.</p>
        <p>Use <code>SHOW_ACTIONS</code> to discover capabilities. Presence means an action is offered, not that every resource or platform supports it. Home owns account context, permissions, local pickers and downloads. The public reference contains no live credentials or account data. Viewing it and copying examples do not open pickers, save files, publish or request account approval.</p>
        <p>Standalone development reads the local Core at <code>http://127.0.0.1:24891</code>, configurable with <code>VITE_QORTIUM_NODE_API_URL</code>. The fallback supports read actions and GET/HEAD, including stream URLs for supported public services; Home navigation, saving and local-source selection require Home. Developers remains readable if Core or the bridge is unavailable.</p>
        <p>Canonical route: <code>qdn://APP/Explore/Explore?view=developers</code>. The aliases <code>developer</code> and <code>reference</code> normalize to developers. The existing browse/detail/file hash is retained, along with unrelated/repeated query parameters. Section links use <code>section</code>. Browse/Developers and Home Back/Forward keep the mounted browser state, including search and Git selections.</p>
      </section>
      <section id="reference-discovery" tabIndex={-1}><h3>Discovery and details</h3>
        <p><code>LIST_QDN_RESOURCES</code> walks services → names → resources; name queries use <code>exactMatchNames: true</code>. <code>SEARCH_QDN_RESOURCES</code> searches metadata with an optional service. Explore requests <code>mode: ALL</code> and <code>limit: 0</code>; effective host/node limits and availability still apply. A one-resource listing replaces its hash with the detail route, without opening another app.</p>
        <p>Current public service filter ({PUBLIC_QDN_SERVICES.length}): {PUBLIC_QDN_SERVICES.join(', ')}. A listed resource is not proof its payload is downloaded, safe to execute or available from the selected node. No private/encrypted resource decryption is offered by this browser.</p>
        <p><code>GET_QDN_RESOURCE_METADATA</code> and <code>GET_QDN_RESOURCE_STATUS</code> are read independently. Either can remain useful when the other fails. <code>GET_QDN_RESOURCE_PROPERTIES</code> provides optional filename/MIME hints and is requested only after READY or DOWNLOADED; its failure does not invalidate the detail. Status, metadata and fetched bytes can represent different observations during propagation.</p>
        <p>The avatar label describes the <em>current name owner</em>, not an immutable original publisher. Explore resolves ownership before <code>FETCH_ACCOUNT_AVATAR</code> with a {AVATAR_MAX_BYTES.toLocaleString('en-US')}-byte limit and validates the response; missing support/content yields a fallback identity.</p>
      </section>
      <section id="reference-files" tabIndex={-1}><h3>Files and Git</h3>
        <p><code>metadata.files</code> is filtered to at most {MAX_RESOURCE_FILES.toLocaleString('en-US')} unique relative paths, each at most {MAX_RESOURCE_FILE_PATH_LENGTH.toLocaleString('en-US')} characters. Absolute paths, backslashes, traversal and control characters are rejected. A selected file must occur in that filtered list. The route <code>#/detail/SERVICE/name/identifier/file/encodedPath</code> encodes the whole path as one component; its default identifier slot remains explicit for file links.</p>
        <p><code>FETCH_QDN_RESOURCE</code> uses <code>path</code> and an explicit <code>maxBytes</code>. Binary reads request <code>encoding: base64</code>; treating raw binary as a text response corrupts it. Text/JSON previews use a {CONTENT_MAX_BYTES.toLocaleString('en-US')}-byte response limit. Thumbnail eligibility requires a known size no larger than {THUMBNAIL_MAX_BYTES.toLocaleString('en-US')} bytes for IMAGE/THUMBNAIL/QCHAT_IMAGE, followed by bounded base64 validation.</p>
        <p>The in-memory text/image preview cache holds at most {MAX_ENTRIES} entries and accounts for up to {MAX_BYTES.toLocaleString('en-US')} bytes as two bytes per string character. Its key is the tuple/path/content kind, with no publication signature or TTL. Refresh reloads listings; it does not invalidate every preview. Reload Explore when a tuple was republished and a cached preview is stale.</p>
        <p>Git is read-only: bare and <code>.git</code> worktree layouts can show branches, bounded commit history and a selected commit’s file tree/blob. Repository limits are {MAX_REPOSITORY_PATHS.toLocaleString('en-US')} paths, {MAX_PATH_BYTES.toLocaleString('en-US')} UTF-8 bytes per path, {MAX_GIT_FILE_BYTES.toLocaleString('en-US')} bytes per fetched Git file/blob, {MAX_CACHED_BYTES.toLocaleString('en-US')} cached bytes and {MAX_GIT_HISTORY_DEPTH} history entries. The earlier metadata-files filter can be narrower. Git loading/parse failures return to plain published-file inspection; Explore never clones to disk, checks out executable content, commits or pushes.</p>
      </section>
      <section id="reference-viewers" tabIndex={-1}><h3>Viewers and local previews</h3>
        <p>{PUBLIC_QDN_SERVICES.filter(isBrowserArchiveService).join(', ')} open through <code>OPEN_CURRENT_TAB</code> or <code>OPEN_NEW_TAB</code>. Other public resources prefer <code>OPEN_QDN_RESOURCE_VIEWER</code> when advertised. Older hosts use <code>OPEN_QDN_MEDIA_PLAYER</code> or <code>OPEN_QDN_DOCUMENT_VIEWER</code> where applicable; otherwise Explore renders a bounded internal preview or offers Download. <code>SAVE_QDN_RESOURCE</code> saves original bytes through Home; it does not publish them.</p>
        <p>Inline media feature-detects <code>GET_QDN_RESOURCE_STREAM_URL</code>. Eligible image/audio/video content uses Home URLs (credential-free HTTP(S), or desktop’s exact <code>qortium-home-resource://stream/UUID</code> capability); audio/video load metadata and the browser requests ranges as needed. These URLs are temporary and must not be shared or stored. Known raster images ({STREAM_IMAGE_MIME_TYPES.join(', ')}) are fetched into revocable blob URLs. SVG and unknown image types use the bounded image reader, because Home’s stream MIME policy excludes them. The streamed-image path is distinct from the small-thumbnail/2 MiB fallback bounds and can fetch a larger image. Missing stream capability retains bounded text/image previews and Open fallbacks; a failed advertised stream reports an error.</p>
        <p>Internal HTML/source is displayed as text, not executed. Markdown support is intentionally limited to text/headings, and CSV parsing is a simple comma split, not a full quoted-field parser. MIME/filename classification is a presentation hint, not a safety verdict.</p>
        <p>Preview local file/folder requires {Array.from(SOURCE_PREVIEW_ACTIONS).map((a, i) => <span key={a}>{i ? ' and ' : ''}<code>{a}</code></span>)} and the Home bridge. Home’s native picker returns an opaque source token; Explore uses it to open a local preview and keeps only display metadata. Canceling selection makes no preview request. Folder support varies by Home/platform. Local preview is not a QDN publish, and successful preview does not mean content has been signed or broadcast.</p>
      </section>
      <section id="reference-examples" tabIndex={-1}><h3>Bridge examples</h3><p>Copying examples does not execute them. Adapt sample resources and validate responses; keep Open, Download and picker actions behind a user decision.</p>
        {Object.entries(REFERENCE_SNIPPETS).map(([key, value]) => <div className="reference-example" key={key}><h4>{key}</h4><button type="button" aria-label={`Copy ${key} example`} onClick={event => void copy(key, value, event.currentTarget)}>Copy</button><pre aria-label={`${key} example`}><code>{value}</code></pre></div>)}
      </section>
    </div>
  </article>;
}
