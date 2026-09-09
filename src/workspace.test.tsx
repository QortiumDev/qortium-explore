// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { hashForRoute } from './appRoute';
const host = vi.hoisted(() => ({ request: vi.fn<(request: { action: string; [key: string]: unknown }) => Promise<unknown>>() }));
vi.mock('./qdnRequest', () => ({ qdnRequest: host.request, hasHomeBridge: () => true }));
vi.mock('./NameOwnerIdentity', () => ({ NameOwnerIdentity: () => null }));
vi.mock('./contentViewer', async importOriginal => ({ ...await importOriginal<typeof import('./contentViewer')>(), ContentViewer: () => <p>Safe fixture content</p> }));
let node: HTMLDivElement, root: Root;
const settle = async () => { await act(async () => { await new Promise(r => setTimeout(r, 10)); }); };
const click = async (element: Element) => { await act(async () => { (element as HTMLElement).click(); }); await settle(); };
const workspace = (i: number) => document.querySelectorAll('.workspace-tabs button')[i];
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  history.replaceState({ host: 'preserve' }, '', '/?future=a&future=b#/services');
  host.request.mockReset().mockImplementation(async request => {
    if (request.action === 'SHOW_ACTIONS') return [];
    if (request.action === 'GET_QDN_RESOURCE_METADATA') return { files: ['a.txt', 'src/b.txt'] };
    if (request.action === 'GET_QDN_RESOURCE_STATUS') return { status: 'READY' };
    if (request.action === 'GET_QDN_RESOURCE_PROPERTIES') return {};
    return [{ service: 'APP', name: 'Explore', identifier: 'Explore' }];
  });
  node = document.createElement('div');document.body.append(node);root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount());node.remove(); });
describe('Explore workspace integration', () => {
  it('keeps search draft/results through Developers and real browser history', async () => {
    await act(async () => root.render(<App />));await settle();
    const input = document.querySelector('.search input') as HTMLInputElement;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'keep this search');input.dispatchEvent(new Event('input', { bubbles: true })); });
    await click(document.querySelector('.search button')!);expect(document.querySelectorAll('.resource')).toHaveLength(1);
    await click(workspace(1));expect(document.querySelector('.browse-workspace')?.hasAttribute('hidden')).toBe(true);
    expect(history.state).toEqual({ host: 'preserve' });expect(new URL(location.href).searchParams.getAll('future')).toEqual(['a', 'b']);
    await act(async () => { history.back();await new Promise(r => setTimeout(r, 30)); });
    expect(document.querySelector('.reference')).toBeNull();expect(input.value).toBe('keep this search');expect(document.querySelectorAll('.resource')).toHaveLength(1);
    await act(async () => { history.forward();await new Promise(r => setTimeout(r, 30)); });expect(document.querySelector('.reference')).not.toBeNull();
    expect(host.request.mock.calls.every(([r]) => !/^(PUBLISH|SAVE|OPEN|SELECT|PREVIEW)_/.test(r.action))).toBe(true);
  });
  it('preserves a selected file across section links and returning to Browse', async () => {
    const hash = hashForRoute({ kind: 'detail', service: 'FILES', name: 'Example', identifier: 'src', path: 'src/b.txt' });
    history.replaceState(null, '', '/?view=reference&future=a&future=b' + hash);
    await act(async () => root.render(<App />));await settle();
    expect(document.querySelector('.file-row--active')?.textContent).toBe('src/b.txt');
    await click(document.querySelector('a[href*="section=files"]')!);expect(location.hash).toBe(hash);
    await click(workspace(0));expect(document.querySelector('.file-row--active')?.textContent).toBe('src/b.txt');expect(location.hash).toBe(hash);
  });
  it('does not let late single-result redirect replace the Developers workspace', async () => {
    let resolve!: (value: unknown) => void;
    host.request.mockImplementation(request => request.action === 'LIST_QDN_RESOURCES' ? new Promise(r => { resolve = r; }) : Promise.resolve([]));
    history.replaceState(null, '', '/?view=developers#/resource/APP/Explore');
    await act(async () => root.render(<App />));await settle();
    await act(async () => resolve([{ service: 'APP', name: 'Explore', identifier: 'Explore' }]));await settle();
    expect(location.hash).toBe('#/detail/APP/Explore/Explore');expect(document.querySelector('.reference')).not.toBeNull();
    expect(document.querySelector('.browse-workspace')?.hasAttribute('hidden')).toBe(true);
  });
  it('keeps the reference available offline', async () => {
    history.replaceState(null, '', '/?view=developers#/services');host.request.mockRejectedValue(Error('Offline'));
    await act(async () => root.render(<App />));await settle();expect(document.querySelector('.reference')).not.toBeNull();
    expect(document.querySelector('.browse-workspace')?.hasAttribute('hidden')).toBe(true);
  });
});
