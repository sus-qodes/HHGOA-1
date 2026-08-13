export const TEMPLATE_CONTRACT = Object.freeze({
  id: "builder-pass-v2",
  version: 2,
});

export const SHARE_IMAGE_CONTRACT = Object.freeze({
  mimeType: "image/png",
  width: 1134,
  height: 1926,
  maxInputBytes: 8 * 1024 * 1024,
  maxStoredBytes: 8 * 1024 * 1024,
  maxInputPixels: 1134 * 1926,
  maxPages: 1,
});

export const OG_IMAGE_CONTRACT = Object.freeze({
  mimeType: "image/jpeg",
  width: 1200,
  height: 630,
  maxStoredBytes: 1024 * 1024,
});

export const SHARE_ID_BYTES = 24;
export const SHARE_ID_LENGTH = 32;
export const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{32}$/u;
export const DEFAULT_RETENTION_DAYS = 90;
export const STAGING_RETENTION_HOURS = 24;
export const CLIENT_UPLOAD_TOKEN_LIFETIME_MS = 15 * 60 * 1000;

export const BLOB_PATHS = Object.freeze({
  staging(shareId: string): string {
    return `staging/${shareId}/source.png`;
  },
  card(shareId: string): string {
    return `passes/${shareId}/card.png`;
  },
  og(shareId: string): string {
    return `passes/${shareId}/og.jpg`;
  },
  manifest(shareId: string): string {
    return `passes/${shareId}/manifest.json`;
  },
});
