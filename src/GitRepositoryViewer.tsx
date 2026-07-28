import { useEffect, useMemo, useRef, useState } from 'react';
import { classifyContent, ContentPreview } from './contentViewer';
import { createTranslator } from './i18n';
import { qdnRequest } from './qdnRequest';
import { QdnGitRepositoryReader, type QdnGitCommit } from './qdnGitRepository';
import { resourceFetchRequest } from './resourceFiles';
import type { QdnResource } from './types';

type RepoState = { phase: 'loading' } | { branch: string; commit: QdnGitCommit; files: string[]; phase: 'ready' };
type BlobState = { path: string; phase: 'loading' } | { message: string; path: string; phase: 'error' } | { bytes: Uint8Array; path: string; phase: 'ready' };

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

/**
 * Read-only viewer for a published Git repository (bare or worktree). All Git
 * parsing happens in the app from per-file resource fetches; nothing here can
 * write. Errors surface through onFallback so the caller can show the raw
 * published files instead.
 */
export function GitRepositoryViewer({ files, language, onFallback, resource }: { files: string[]; language: unknown; onFallback: (message: string) => void; resource: QdnResource }) {
  const t = useMemo(() => createTranslator(language), [language]);
  const [repo, setRepo] = useState<RepoState>({ phase: 'loading' });
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
    setRepo({ phase: 'loading' });
    setBlob(null);
    void (async () => {
      const overview = await reader.getOverview();
      const branch = overview.currentBranch ?? overview.branches[0];
      if (!branch) throw new Error(t('git.empty'));
      const [commit] = await reader.getHistory(branch, 1);
      if (!commit) throw new Error(t('git.empty'));
      const paths = await reader.listFiles(commit.oid);
      if (active) setRepo({ branch, commit, files: paths, phase: 'ready' });
    })().catch(error => { if (active) onFallback(error instanceof Error ? error.message : String(error)); });
    return () => { active = false; };
  }, [onFallback, reader, readerResult, t]);

  const openPath = async (path: string) => {
    if (!reader || repo.phase !== 'ready') return;
    const requestId = ++blobRequestRef.current;
    setBlob({ path, phase: 'loading' });
    try {
      const bytes = await reader.readBlob(repo.commit.oid, path);
      if (requestId === blobRequestRef.current) setBlob({ bytes, path, phase: 'ready' });
    } catch (error) {
      if (requestId === blobRequestRef.current) setBlob({ message: error instanceof Error ? error.message : String(error), path, phase: 'error' });
    }
  };

  if (repo.phase !== 'ready') return <p className="loading">{t('loading')}</p>;
  const viewed = blob ? { ...resource, path: blob.path } : resource;
  const kind = blob?.phase === 'ready' ? classifyContent(viewed) : null;
  return <>
    <p className="git-meta"><strong>{t('git.branch')}</strong> {repo.branch} · <strong>{t('git.commit')}</strong> <code>{repo.commit.oid.slice(0, 8)}</code> {repo.commit.summary}</p>
    {blob ? <>
      <button className="file-clear" type="button" onClick={() => { blobRequestRef.current += 1; setBlob(null); }}>{t('action.allFiles')}</button>
      <h3 className="git-path">{blob.path}</h3>
      {blob.phase === 'loading' ? <p className="loading">{t('loading')}</p> : blob.phase === 'error' ? <p className="error">{blob.message}</p> : kind ? <ContentPreview kind={kind} data={kind === 'image' ? bytesToBase64(blob.bytes) : new TextDecoder().decode(blob.bytes)} resource={viewed} /> : null}
    </> : <div className="file-list">{repo.files.map(path => <button className="file-row" key={path} type="button" onClick={() => void openPath(path)}>{path}</button>)}</div>}
  </>;
}
