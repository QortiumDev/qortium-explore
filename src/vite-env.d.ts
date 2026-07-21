/// <reference types="vite/client" />

import type { QdnRequest } from './qdnRequest';

declare global {
  const __APP_VERSION__: string;
  interface Window {
    qdnRequest?: <T = unknown>(request: QdnRequest) => Promise<T>;
    _qdnTheme?: unknown;
    _qdnUiStyle?: unknown;
    _qdnUIStyle?: unknown;
  }
}
