const MAX_ENTRIES = 12;
const MAX_BYTES = 24 * 1024 * 1024;

type PreviewEntry = { data: string; size: number };

export class PreviewCache {
  private readonly entries = new Map<string, PreviewEntry>();
  private totalBytes = 0;

  constructor(
    private readonly maxEntries = MAX_ENTRIES,
    private readonly maxBytes = MAX_BYTES,
  ) {}

  get(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.data;
  }

  set(key: string, data: string) {
    const size = data.length * 2;
    const old = this.entries.get(key);
    if (old) {
      this.totalBytes -= old.size;
      this.entries.delete(key);
    }
    if (size > this.maxBytes) return;
    this.entries.set(key, { data, size });
    this.totalBytes += size;
    while (this.entries.size > this.maxEntries || this.totalBytes > this.maxBytes) {
      const oldestKey = this.entries.keys().next().value;
      if (typeof oldestKey !== 'string') break;
      const oldest = this.entries.get(oldestKey);
      this.entries.delete(oldestKey);
      this.totalBytes -= oldest?.size ?? 0;
    }
  }
}

export const previewCache = new PreviewCache();

export function previewCacheKey(resource: { service: string; name: string; identifier?: string; path?: string }, kind: string) {
  return [resource.service, resource.name, resource.identifier || 'default', resource.path || '', kind].join('\u0000');
}
