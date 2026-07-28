// Keep this list in parity with qortium-home/electron/qdn-public-services.ts.
export const PUBLIC_QDN_SERVICES = [
  'APP', 'WEBSITE', 'IMAGE', 'THUMBNAIL', 'QCHAT_IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'PODCAST', 'DOCUMENT',
  'FILE', 'FILES', 'JSON', 'METADATA', 'BLOG', 'BLOG_POST', 'BLOG_COMMENT', 'LIST', 'PLAYLIST',
  'GIT_REPOSITORY', 'GIF_REPOSITORY', 'IMAGE_GALLERY', 'STORE', 'PRODUCT', 'OFFER', 'COUPON', 'CODE',
  'PLUGIN', 'EXTENSION', 'GAME', 'ITEM', 'NFT', 'DATABASE', 'SNAPSHOT', 'COMMENT', 'CHAIN_COMMENT',
  'CHAIN_DATA', 'ATTACHMENT', 'MAIL', 'MESSAGE',
] as const;

export type PublicQdnService = (typeof PUBLIC_QDN_SERVICES)[number];
export const isPublicQdnService = (value: string): value is PublicQdnService =>
  PUBLIC_QDN_SERVICES.includes(value as PublicQdnService);

// Services Home hosts as browser content instead of handing to a viewer or a
// download. Keep in parity with
// qortium-home/electron/qdn-browser-archive-services.ts — treating GAME
// differently from APP and WEBSITE is what left a published game downloadable
// but not openable.
export const BROWSER_ARCHIVE_SERVICES = ['APP', 'WEBSITE', 'GAME'] as const;

export type BrowserArchiveService = (typeof BROWSER_ARCHIVE_SERVICES)[number];
export const isBrowserArchiveService = (value: string): value is BrowserArchiveService =>
  BROWSER_ARCHIVE_SERVICES.includes(value.toUpperCase() as BrowserArchiveService);
