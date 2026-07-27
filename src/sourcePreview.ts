import type { QdnRequest } from './qdnRequest';

export type QdnBridgeRequest = <T = unknown>(request: QdnRequest) => Promise<T>;

export type SelectedQdnPublishSource = {
  fileName: string;
  kind: 'directory' | 'file';
  size: number | null;
};

export type SourcePreviewResult =
  | { kind: 'canceled' }
  | { kind: 'opened'; source: SelectedQdnPublishSource };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function selectedSource(value: unknown): { source: SelectedQdnPublishSource; sourceToken: string } | null {
  if (!isRecord(value)) throw new Error('Home returned an invalid selected-source result.');
  if (value.canceled === true) return null;
  const sourceToken = typeof value.sourceToken === 'string' ? value.sourceToken : '';
  if (!sourceToken) throw new Error('Home did not return a selected-source token.');
  return {
    sourceToken,
    source: {
      fileName: typeof value.fileName === 'string' && value.fileName ? value.fileName : 'Selected source',
      kind: value.kind === 'directory' ? 'directory' : 'file',
      size: typeof value.size === 'number' && Number.isFinite(value.size) ? value.size : null,
    },
  };
}

// Home keeps the selected bytes, local path, and render URL private. Explore
// receives only the opaque source token long enough to request the preview.
export async function previewQdnPublishSource(request: QdnBridgeRequest, kind: 'directory' | 'file' = 'file'): Promise<SourcePreviewResult> {
  const selection = selectedSource(await request<unknown>({ action: 'SELECT_QDN_PUBLISH_SOURCE', kind }));
  if (!selection) return { kind: 'canceled' };

  const opened = await request<unknown>({ action: 'PREVIEW_QDN_PUBLISH_SOURCE', sourceToken: selection.sourceToken });
  if (opened !== true) throw new Error('Home did not open the selected-source preview.');
  return { kind: 'opened', source: selection.source };
}
