import { describe, expect, it, vi } from 'vitest';
import {
  AVATAR_MAX_BYTES,
  getNameOwner,
  initialsForName,
  loadNameAvatar,
  parseAccountAvatar,
  supportsAccountAvatars,
} from './avatarClient';

const ADDRESS = 'QcurrentOwner';
const pointer = { service: 'THUMBNAIL', name: 'avatar-designer', identifier: 'portrait' };

describe('account avatar client', () => {
  it('extracts a current name owner and ignores malformed responses', () => {
    expect(getNameOwner('Alice Name', { owner: ADDRESS })).toEqual({ name: 'Alice Name', address: ADDRESS });
    expect(getNameOwner('Alice Name', { data: { owner: ` ${ADDRESS} ` } })).toEqual({ name: 'Alice Name', address: ADDRESS });
    expect(getNameOwner('Alice Name', { owner: '' })).toBeNull();
    expect(getNameOwner('Alice Name', { address: ADDRESS })).toBeNull();
  });

  it('uses only the advertised account-avatar capability', () => {
    expect(supportsAccountAvatars(['FETCH_QDN_RESOURCE', 'FETCH_ACCOUNT_AVATAR'])).toBe(true);
    expect(supportsAccountAvatars(['FETCH_QDN_RESOURCE'])).toBe(false);
    expect(supportsAccountAvatars({ actions: ['FETCH_ACCOUNT_AVATAR'] })).toBe(false);
  });

  it('parses pointer and legacy ready responses only when their bounded bytes are valid', () => {
    const ready = {
      address: ADDRESS, body: 'AQID', contentLength: 3, contentType: 'image/png', descriptor: pointer,
      encoding: 'base64', source: 'POINTER',
    };
    expect(parseAccountAvatar(ready, ADDRESS)).toMatchObject({ kind: 'ready', source: 'POINTER', descriptor: pointer, bytes: new Uint8Array([1, 2, 3]) });
    expect(parseAccountAvatar({ ...ready, source: 'LEGACY', descriptor: null }, ADDRESS)).toMatchObject({ kind: 'ready', source: 'LEGACY', descriptor: null });
    expect(parseAccountAvatar({ ...ready, contentType: 'image/bmp' }, ADDRESS)).toMatchObject({ kind: 'ready', contentType: 'image/bmp' });
    expect(parseAccountAvatar({ ...ready, contentType: 'image/svg+xml' }, ADDRESS)).toBeNull();
    expect(parseAccountAvatar({ ...ready, body: 'not-base64' }, ADDRESS)).toBeNull();
    expect(parseAccountAvatar({ ...ready, contentLength: AVATAR_MAX_BYTES + 1 }, ADDRESS)).toBeNull();
    expect(parseAccountAvatar({ ...ready, address: 'Qother' }, ADDRESS)).toBeNull();
    expect(parseAccountAvatar({ ...ready, descriptor: null }, ADDRESS)).toBeNull();
  });

  it('keeps a pending pointer result retryable without accepting unknown status shapes', () => {
    const pending = { address: ADDRESS, descriptor: pointer, retryAfterSeconds: 4.8, source: 'POINTER', status: 'PENDING' };
    expect(parseAccountAvatar(pending, ADDRESS)).toEqual({ kind: 'pending', address: ADDRESS, source: 'POINTER', descriptor: pointer, retryAfterSeconds: 4 });
    expect(parseAccountAvatar({ ...pending, status: 'NOT_YET_RELEASED' }, ADDRESS)).toBeNull();
  });

  it('retains the resolved owner when avatar support is unavailable', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ owner: ADDRESS })
      .mockResolvedValueOnce(['FETCH_NODE_API']);
    await expect(loadNameAvatar('Alice Name', request)).resolves.toEqual({ kind: 'unsupported', address: ADDRESS });
    expect(request).toHaveBeenNthCalledWith(1, { action: 'FETCH_NODE_API', path: '/names/Alice%20Name' });
    expect(request).toHaveBeenNthCalledWith(2, { action: 'SHOW_ACTIONS' });
  });

  it('resolves the name owner before requesting a pointer-aware avatar', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ owner: ADDRESS })
      .mockResolvedValueOnce(['SHOW_ACTIONS', 'FETCH_ACCOUNT_AVATAR'])
      .mockResolvedValueOnce({ address: ADDRESS, body: 'AQID', contentLength: 3, contentType: 'image/webp', descriptor: pointer, encoding: 'base64', source: 'POINTER' });
    await expect(loadNameAvatar('Alice / Name', request)).resolves.toMatchObject({ kind: 'ready', address: ADDRESS, contentType: 'image/webp' });
    expect(request).toHaveBeenNthCalledWith(1, { action: 'FETCH_NODE_API', path: '/names/Alice%20%2F%20Name' });
    expect(request).toHaveBeenNthCalledWith(3, { action: 'FETCH_ACCOUNT_AVATAR', address: ADDRESS, maxBytes: AVATAR_MAX_BYTES });
  });

  it('uses a single initial as the unavailable-image fallback', () => {
    expect(initialsForName(' alice')).toBe('A');
    expect(initialsForName('')).toBe('?');
  });
});
