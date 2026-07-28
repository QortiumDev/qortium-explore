import { useEffect, useMemo, useRef, useState } from 'react';
import { classifyContent, ContentPreview } from './contentViewer';
import { createTranslator } from './i18n';
import { qdnRequest } from './qdnRequest';
import { QdnGitRepositoryReader, type QdnGitCommit, type QdnGitOverview } from './qdnGitRepository';
import { resourceFetchRequest } from './resourceFiles';
import type { QdnResource } from './types';

type Async<T> = { phase: 'idle' } | { phase: 'loading' } | { message: string; phase: 'error' } | { phase: 'ready'; value: T };
type BlobState = { path: string; phase: 'loading' } | { message: string; path: string; phase: 'error' } | { bytes: Uint8Array; path: string; phase: 'ready' };

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

function commitDate(timestamp: number | null) {
  return timestamp === null ? '' : new Date(timestamp * 1_000).toLocaleString();
}

/**
 * Read-only viewer for a published Git repository (bare or worktree). All Git
 * parsing happens in the app from per-file resource fetches; nothing here can
 * write. Repository-level errors surface through onFallback so the caller can
 * show the raw published files instead.
 */
export function GitRepositoryViewer({ files, language, onFallback, resource }: { files: string[]; language: unknown; onFallback: (message: string) => void; resource: QdnResource }) {
  const t = useMemo(() => createTranslator(language), [language]);
  const [overview, setOverview] = useState<Async<QdnGitOverview>>({ phase: 'loading' });
  const [branch, setBranch] = useState('');
  const [history, setHistory] = useState<Async<QdnGitCommit[]>>({ phase: 'idle' });
  const [commitOid, setCommitOid] = useState('');
  const [tree, setTree] = useState<Async<string[]>>({ phase: 'idle' });
  const [blob, setBlob] = useState<BlobState | null>(null);
  const blobRequestRef = useRef(0);
  const readerResult = useMemo(() => {
    try {
      const target = { identifier: resource.identifier, name: resource.name, service: resource.service };
      return { reader: new QdnGitRepositoryReader(files, async (path, maxBytes) => ({ data: String(await qdnRequest<unknown>(resourceFetchRequest({ ...target, path }, { binary: true, maxBytes }))) })) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [files, resource.identifier, resource.name, resource.service]);
  const reader = 'reader' in readerResult ? readerResult.reader : null;

  useEffect(() => {
    if (!reader) { onFallback('error' in readerResult && readerResult.error ? readerResult.error : 'Unable to read the Git repository.'); return; }
    let active = true;
    blobRequestRef.current += 1;
    setOverview({ phase: 'loading' });
    setBranch('');
    setBlob(null);
    void reader.getOverview()
      .then(value => { if (active) { setOverview({ phase: 'ready', value }); setBranch(value.currentBranch ?? value.branches[0] ?? ''); } })
      .catch(error => { if (active) onFallback(error instanceof Error ? error.message : String(error)); });
    return () => { active = false; };
  }, [onFallback, reader, readerResult]);

  useEffect(() => {
    if (!reader || !branch) { setHistory({ phase: branch ? 'loading' : 'idle' }); setCommitOid(''); return; }
    let active = true;
    blobRequestRef.current += 1;
    setHistory({ phase: 'loading' });
    setCommitOid('');
    setBlob(null);
    void reader.getHistory(branch)
      .then(value => { if (active) { setHistory({ phase: 'ready', value }); setCommitOid(value[0]?.oid ?? ''); } })
      .catch(error => { if (active) onFallback(error instanceof Error ? error.message : String(error)); });
    return () => { active = false; };
  }, [branch, onFallback, reader]);

  useEffect(() => {
    if (!reader || !commitOid) { setTree({ phase: 'idle' }); return; }
    let active = true;
    blobRequestRef.current += 1;
    setTree({ phase: 'loading' });
    setBlob(null);
    void reader.listFiles(commitOid)
      .then(value => { if (active) setTree({ phase: 'ready', value }); })
      .catch(error => { if (active) setTree({ message: error instanceof Error ? error.message : String(error), phase: 'error' }); });
    return () => { active = false; };
  }, [commitOid, reader]);

  const openPath = async (path: string) => {
    if (!reader || !commitOid) return;
    const requestId = ++blobRequestRef.current;
    setBlob({ path, phase: 'loading' });
    try {
      const bytes = await reader.readBlob(commitOid, path);
      if (requestId === blobRequestRef.current) setBlob({ bytes, path, phase: 'ready' });
    } catch (error) {
      if (requestId === blobRequestRef.current) setBlob({ message: error instanceof Error ? error.message : String(error), path, phase: 'error' });
    }
  };

  if (overview.phase !== 'ready') return <p className="loading">{t('loading')}</p>;
  const commits = history.phase === 'ready' ? history.value : [];
  if (!branch || (history.phase === 'ready' && commits.length === 0)) return <p className="viewer-note">{t('git.empty')}</p>;
  const viewed = blob ? { ...resource, path: blob.path } : resource;
  const kind = blob?.phase === 'ready' ? classifyContent(viewed) : null;
  return <>
    <p className="git-meta">
      <label className="git-branch">{t('git.branch')} <select value={branch} onChange={event => setBranch(event.target.value)}>{overview.value.branches.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      {history.phase === 'ready' ? <span>{commits.length.toLocaleString()} · {t('git.history')}</span> : null}
    </p>
    <div className="git-body">
      <aside>
        <h3>{t('git.history')}</h3>
        {history.phase !== 'ready' ? <p className="loading">{t('loading')}</p> : <div className="file-list">{commits.map(commit => <button className={`file-row git-commit${commit.oid === commitOid ? ' file-row--active' : ''}`} key={commit.oid} type="button" title={commit.message} onClick={() => setCommitOid(commit.oid)}><span>{commit.summary}</span><small>{commit.author}{commitDate(commit.authoredAt) ? ` · ${commitDate(commit.authoredAt)}` : ''}</small><code>{commit.oid.slice(0, 8)}</code></button>)}</div>}
      </aside>
      <section>
        {blob ? <>
          <button className="file-clear" type="button" onClick={() => { blobRequestRef.current += 1; setBlob(null); }}>{t('action.allFiles')}</button>
          <h3 className="git-path">{blob.path} <code>@{commitOid.slice(0, 8)}</code></h3>
          {blob.phase === 'loading' ? <p className="loading">{t('loading')}</p> : blob.phase === 'error' ? <p className="error">{blob.message}</p> : kind ? <ContentPreview kind={kind} data={kind === 'image' ? bytesToBase64(blob.bytes) : new TextDecoder().decode(blob.bytes)} resource={viewed} /> : null}
        </> : <>
          <h3 className="git-path">{t('label.files')} <code>@{commitOid.slice(0, 8)}</code></h3>
          {tree.phase === 'error' ? <p className="error">{tree.message}</p> : tree.phase !== 'ready' ? <p className="loading">{t('loading')}</p> : <div className="file-list">{tree.value.map(path => <button className="file-row" key={path} type="button" onClick={() => void openPath(path)}>{path}</button>)}</div>}
        </>}
      </section>
    </div>
  </>;
}
