import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Reference, REFERENCE_SNIPPETS } from './Reference';
import { resourceQuery, resourceSearchRequest } from './exploreContract';
import { resourceFiles, MAX_RESOURCE_FILES, resourceFetchRequest } from './resourceFiles';
import { dispatchOpen } from './dispatcher';
import { CONTENT_MAX_BYTES } from './contentViewer';
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
describe('Explore reference contracts', () => {
  it('renders public English/LTR and accessible copy results', () => {
    const html = renderToStaticMarkup(<Reference />);
    expect(html).toContain('lang="en" dir="ltr"');expect(html).toContain('aria-live="polite"');
    expect(html).toContain(MAX_RESOURCE_FILES.toLocaleString('en-US'));
    for (const key of Object.keys(REFERENCE_SNIPPETS)) expect(html).toContain(`aria-label="Copy ${key} example"`);
  });
  it('uses the real discovery and file request builders', async () => {
    const qdnRequest = vi.fn(async () => []);
    await new AsyncFunction('qdnRequest', REFERENCE_SNIPPETS.discovery)(qdnRequest);
    expect(qdnRequest.mock.calls).toEqual([[resourceQuery({ kind: 'resources', service: 'APP', name: 'Explore' })], [resourceSearchRequest('Explore', 'APP')]]);
    qdnRequest.mockClear();await new AsyncFunction('qdnRequest', REFERENCE_SNIPPETS.file)(qdnRequest);
    expect(qdnRequest).toHaveBeenCalledExactlyOnceWith(resourceFetchRequest({ service: 'APP', name: 'Explore', identifier: 'Explore', path: 'qortium-app.json' }, { maxBytes: CONTENT_MAX_BYTES }));
  });
  it('keeps independent detail results usable and does not ask for optional properties prematurely', async () => {
    const qdnRequest = vi.fn(async ({ action }: { action: string }) => { if (action.endsWith('METADATA')) throw Error('Unavailable');return { status: 'DOWNLOADING' }; });
    await new AsyncFunction('qdnRequest', REFERENCE_SNIPPETS.details)(qdnRequest);
    expect(qdnRequest).toHaveBeenCalledTimes(2);
  });
  it('does not open a viewer or picker merely by evaluating examples', async () => {
    const qdnRequest = vi.fn(async () => []);
    const plans = await new AsyncFunction('qdnRequest', REFERENCE_SNIPPETS.viewers + '\nreturn [appRequest, fileRequest];')(qdnRequest);
    expect(plans[0]).toEqual(dispatchOpen({ service: 'APP', name: 'Explore', identifier: 'Explore' }, { newTab: true }));
    expect(qdnRequest).toHaveBeenCalledExactlyOnceWith({ action: 'SHOW_ACTIONS' });
    qdnRequest.mockClear();await new AsyncFunction('qdnRequest', REFERENCE_SNIPPETS.stream + REFERENCE_SNIPPETS.localPreview)(qdnRequest);
    expect(qdnRequest).not.toHaveBeenCalled();
  });
  it('stops local preview on picker cancellation', async () => {
    const qdnRequest = vi.fn(async () => ({ canceled: true }));
    await new AsyncFunction('qdnRequest', REFERENCE_SNIPPETS.localPreview + '\nawait previewLocalFile();')(qdnRequest);
    expect(qdnRequest).toHaveBeenCalledExactlyOnceWith({ action: 'SELECT_QDN_PUBLISH_SOURCE', kind: 'file' });
  });
  it('filters the documented unsafe file paths through the real metadata parser', () => {
    expect(resourceFiles({ files: ['/abs', '../parent', 'a/../b', 'a\\b', 'nul\0', 'src/ok.ts', 'src/ok.ts'] })).toEqual(['src/ok.ts']);
  });
});
