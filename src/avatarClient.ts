import type { QdnRequest } from './qdnRequest';

export const AVATAR_MAX_BYTES = 500 * 1024;

export type AvatarSource = 'POINTER' | 'LEGACY';
export type AvatarDescriptor = { identifier: string; name: string; service: string };
export type AccountAvatarReady = {
  address: string;
  bytes: Uint8Array;
  contentType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/bmp' | 'image/webp';
  descriptor: AvatarDescriptor | null;
  kind: 'ready';
  source: AvatarSource;
};
export type AccountAvatarPending = {
  address: string;
  descriptor: AvatarDescriptor | null;
  kind: 'pending';
  retryAfterSeconds: number | null;
  source: AvatarSource;
};
export type AccountAvatarResult = AccountAvatarReady | AccountAvatarPending;
export type NameOwner = { address: string; name: string };
export type NameAvatarResult = AccountAvatarResult | { address: string | null; kind: 'unavailable' | 'unsupported' };
export type QdnRequestFunction = <T = unknown>(request: QdnRequest) => Promise<T>;

const AVATAR_CONTENT_TYPES = new Set<AccountAvatarReady['contentType']>(['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/webp']);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function source(value: unknown): AvatarSource | null {
  return value === 'POINTER' || value === 'LEGACY' ? value : null;
}

function descriptor(value: unknown): AvatarDescriptor | null {
  if (value === null || typeof value === 'undefined') return null;
  const candidate = record(value);
  const service = text(candidate?.service), name = text(candidate?.name);
  if (!service || !name || typeof candidate?.identifier !== 'string') return null;
  return { service, name, identifier: candidate.identifier };
}

function decodeBase64(value: string): Uint8Array | null {
  if (!value || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;
  try {
    const decoded = atob(value);
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export function getNameOwner(name: string, value: unknown): NameOwner | null {
  const raw = record(value);
  const data = record(raw?.data) ?? raw;
  const owner = text(data?.owner);
  return owner && name.trim() ? { name: name.trim(), address: owner } : null;
}

export function supportsAccountAvatars(value: unknown): boolean {
  return Array.isArray(value) && value.some((action) => action === 'FETCH_ACCOUNT_AVATAR');
}

export function initialsForName(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '?';
}

export function parseAccountAvatar(value: unknown, expectedAddress: string): AccountAvatarResult | null {
  const raw = record(value);
  const avatarSource = source(raw?.source);
  const address = text(raw?.address);
  if (!raw || !avatarSource || address !== expectedAddress) return null;

  const parsedDescriptor = descriptor(raw.descriptor);
  if (avatarSource === 'POINTER' && !parsedDescriptor) return null;

  if (raw.status === 'PENDING') {
    const retryAfterSeconds = raw.retryAfterSeconds;
    return {
      kind: 'pending', address, source: avatarSource, descriptor: parsedDescriptor,
      retryAfterSeconds: typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
        ? Math.floor(retryAfterSeconds)
        : null,
    };
  }

  if (raw.encoding !== 'base64' || typeof raw.body !== 'string' || typeof raw.contentType !== 'string') return null;
  const contentType = raw.contentType.toLowerCase().split(';', 1)[0] as AccountAvatarReady['contentType'];
  if (!AVATAR_CONTENT_TYPES.has(contentType)) return null;
  const bytes = decodeBase64(raw.body);
  const contentLength = typeof raw.contentLength === 'number' ? raw.contentLength : null;
  if (!bytes || contentLength === null || !Number.isSafeInteger(contentLength) || contentLength < 1 || contentLength > AVATAR_MAX_BYTES || bytes.byteLength !== contentLength) return null;
  return { kind: 'ready', address, source: avatarSource, descriptor: parsedDescriptor, contentType, bytes };
}

export function createAvatarObjectUrl(avatar: AccountAvatarReady): string {
  const bytes = new Uint8Array(avatar.bytes);
  return URL.createObjectURL(new Blob([bytes.buffer], { type: avatar.contentType }));
}

export async function loadNameAvatar(name: string, request: QdnRequestFunction): Promise<NameAvatarResult> {
  try {
    const ownerResponse = await request<unknown>({ action: 'FETCH_NODE_API', path: `/names/${encodeURIComponent(name)}` });
    const owner = getNameOwner(name, ownerResponse);
    if (!owner) return { kind: 'unavailable', address: null };
    let actions: unknown;
    try {
      actions = await request<unknown>({ action: 'SHOW_ACTIONS' });
    } catch {
      return { kind: 'unsupported', address: owner.address };
    }
    if (!supportsAccountAvatars(actions)) return { kind: 'unsupported', address: owner.address };
    const avatarResponse = await request<unknown>({ action: 'FETCH_ACCOUNT_AVATAR', address: owner.address, maxBytes: AVATAR_MAX_BYTES });
    return parseAccountAvatar(avatarResponse, owner.address) ?? { kind: 'unavailable', address: owner.address };
  } catch {
    return { kind: 'unavailable', address: null };
  }
}
