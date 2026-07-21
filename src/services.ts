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
