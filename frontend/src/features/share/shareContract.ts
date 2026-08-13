export const SHARE_TEMPLATE_ID = "builder-pass-v2";
export const SHARE_TEMPLATE_VERSION = 2;
export const SHARE_IMAGE_WIDTH = 1_134;
export const SHARE_IMAGE_HEIGHT = 1_926;
export const SHARE_IMAGE_MIME_TYPE = "image/png";
export const SHARE_MAXIMUM_SIZE_IN_BYTES = 8 * 1_024 * 1_024;

/**
 * The one immutable image contract accepted by the v2 public-pass pipeline.
 * Frame-specific renderer IDs deliberately do not cross this boundary.
 */
export const SHARE_PUBLISH_CONTRACT = Object.freeze({
  template: Object.freeze({
    id: SHARE_TEMPLATE_ID,
    version: SHARE_TEMPLATE_VERSION,
  }),
  image: Object.freeze({
    width: SHARE_IMAGE_WIDTH,
    height: SHARE_IMAGE_HEIGHT,
    mimeType: SHARE_IMAGE_MIME_TYPE,
    maximumSizeInBytes: SHARE_MAXIMUM_SIZE_IN_BYTES,
  }),
});

export const SHARE_PROBLEM_CODES = Object.freeze([
  "EMPTY_BODY",
  "INVALID_REQUEST",
  "INVALID_TEMPLATE_CONTRACT",
  "ORIGIN_NOT_ALLOWED",
  "REQUEST_BODY_TIMEOUT",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "IMAGE_TYPE_MISMATCH",
  "UNSUPPORTED_TEMPLATE",
  "INVALID_IMAGE",
  "INVALID_IMAGE_DIMENSIONS",
  "ANIMATED_IMAGE_NOT_SUPPORTED",
  "HOSTED_IMAGE_TOO_LARGE",
  "RATE_LIMITED",
  "SERVICE_BUSY",
  "IMAGE_PROCESSING_TIMEOUT",
  "SHARE_STORAGE_UNAVAILABLE",
  "SHARE_NOT_FOUND",
  "UPLOAD_NOT_FOUND",
  "UPLOAD_NOT_READY",
  "UPLOAD_ALREADY_FINALIZED",
  "ROUTE_NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "INTERNAL_ERROR",
] as const);

export type ShareProblemCode = (typeof SHARE_PROBLEM_CODES)[number];

const SHARE_PROBLEM_CODE_SET: ReadonlySet<string> = new Set(
  SHARE_PROBLEM_CODES,
);

export function isShareProblemCode(value: unknown): value is ShareProblemCode {
  return typeof value === "string" && SHARE_PROBLEM_CODE_SET.has(value);
}

export interface ShareTemplateContract {
  readonly id: typeof SHARE_TEMPLATE_ID;
  readonly version: typeof SHARE_TEMPLATE_VERSION;
}

export interface HostedShare {
  readonly id: string;
  /** Canonical public `/pass/:id` URL used in social shares. */
  readonly url: string;
  readonly cardUrl: string;
  readonly ogImageUrl: string;
  readonly template: ShareTemplateContract;
  readonly retentionDays: number;
  readonly scheduledDeletionAfter: string;
}

export interface HostedShareUpload {
  readonly id: string;
  readonly pathname: string;
  readonly tokenUrl: string;
  readonly finalizeUrl: string;
  readonly access: "public";
  readonly contentType: typeof SHARE_IMAGE_MIME_TYPE;
  readonly maximumSizeInBytes: typeof SHARE_MAXIMUM_SIZE_IN_BYTES;
  readonly multipart: true;
  readonly template: ShareTemplateContract;
}
