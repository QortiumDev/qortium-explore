import { describe, expect, it } from 'vitest';
import type { QdnRequest } from './qdnRequest';
import { previewQdnPublishSource, type QdnBridgeRequest } from './sourcePreview';

describe('previewQdnPublishSource', () => {
  it("uses Home's opaque selected-source token to open a file preview", async () => {
    const calls: QdnRequest[] = [];
    const request: QdnBridgeRequest = async <T>(input: QdnRequest) => {
      calls.push(input);
      return (input.action === 'SELECT_QDN_PUBLISH_SOURCE'
        ? { canceled: false, fileName: 'draft.md', kind: 'file', size: 42, sourceToken: 'opaque-token' }
        : true) as T;
    };

    await expect(previewQdnPublishSource(request)).resolves.toEqual({ kind: 'opened', source: { fileName: 'draft.md', kind: 'file', size: 42 } });
    expect(calls).toEqual([
      { action: 'SELECT_QDN_PUBLISH_SOURCE', kind: 'file' },
      { action: 'PREVIEW_QDN_PUBLISH_SOURCE', sourceToken: 'opaque-token' },
    ]);
  });

  it('does not request a preview after the Home picker is canceled', async () => {
    const calls: QdnRequest[] = [];
    const request: QdnBridgeRequest = async <T>(input: QdnRequest) => {
      calls.push(input);
      return { canceled: true } as T;
    };
    await expect(previewQdnPublishSource(request)).resolves.toEqual({ kind: 'canceled' });
    expect(calls).toEqual([{ action: 'SELECT_QDN_PUBLISH_SOURCE', kind: 'file' }]);
  });

  it("rejects a selection without Home's opaque token", async () => {
    const request: QdnBridgeRequest = async <T>() => ({ canceled: false, fileName: 'draft.md' }) as T;
    await expect(previewQdnPublishSource(request)).rejects.toThrow('selected-source token');
  });

  it('requires Home to acknowledge that it opened the preview', async () => {
    const request: QdnBridgeRequest = async <T>(input: QdnRequest) => (input.action === 'SELECT_QDN_PUBLISH_SOURCE'
      ? { canceled: false, sourceToken: 'opaque-token' }
      : false) as T;
    await expect(previewQdnPublishSource(request)).rejects.toThrow('did not open');
  });
});
