export type QdnResourceStatus = { status?: string; localChunkCount?: number; size?: number; totalChunkCount?: number; updated?: number };

export type QdnResource = {
  created?: number;
  identifier?: string;
  metadata?: { description?: string; title?: string };
  name: string;
  path?: string;
  service: string;
  size?: number;
  status?: QdnResourceStatus;
  updated?: number;
};

export type ResourceDetails = {
  metadata?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  status?: QdnResourceStatus;
};
