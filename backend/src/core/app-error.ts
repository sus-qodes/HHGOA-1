export type ProblemCode =
  | "EMPTY_BODY"
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "ORIGIN_NOT_ALLOWED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "IMAGE_TYPE_MISMATCH"
  | "INVALID_IMAGE"
  | "INVALID_IMAGE_DIMENSIONS"
  | "ANIMATED_IMAGE_NOT_SUPPORTED"
  | "HOSTED_IMAGE_TOO_LARGE"
  | "UPLOAD_NOT_READY"
  | "RATE_LIMITED"
  | "SERVICE_BUSY"
  | "IMAGE_PROCESSING_TIMEOUT"
  | "SHARE_STORAGE_UNAVAILABLE"
  | "SHARE_NOT_FOUND"
  | "ROUTE_NOT_FOUND"
  | "INTERNAL_ERROR";

interface ProblemDefinition {
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly retryable: boolean;
}

const PROBLEMS: Readonly<Record<ProblemCode, ProblemDefinition>> = Object.freeze({
  EMPTY_BODY: {
    status: 400,
    title: "The request body is empty",
    detail: "Generate the Builder Pass again and retry.",
    retryable: false,
  },
  INVALID_REQUEST: {
    status: 400,
    title: "The request is invalid",
    detail: "Check the request and retry.",
    retryable: false,
  },
  UNAUTHORIZED: {
    status: 401,
    title: "Authentication is required",
    detail: "The supplied service credential is invalid.",
    retryable: false,
  },
  ORIGIN_NOT_ALLOWED: {
    status: 403,
    title: "This origin is not allowed",
    detail: "Open the official HH Goa generator and retry.",
    retryable: false,
  },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    title: "The image is too large",
    detail: "Generate a smaller share image and retry.",
    retryable: false,
  },
  UNSUPPORTED_MEDIA_TYPE: {
    status: 415,
    title: "The image type is not supported",
    detail: "Generate a PNG Builder Pass and retry.",
    retryable: false,
  },
  IMAGE_TYPE_MISMATCH: {
    status: 415,
    title: "The image type does not match its contents",
    detail: "Generate the Builder Pass again and retry.",
    retryable: false,
  },
  INVALID_IMAGE: {
    status: 422,
    title: "The image is invalid",
    detail: "Generate the Builder Pass again and retry.",
    retryable: false,
  },
  INVALID_IMAGE_DIMENSIONS: {
    status: 422,
    title: "The image dimensions are invalid",
    detail: "The shared Builder Pass must be exactly 1134 by 1926 pixels.",
    retryable: false,
  },
  ANIMATED_IMAGE_NOT_SUPPORTED: {
    status: 422,
    title: "Animated images are not supported",
    detail: "Generate a single-frame PNG Builder Pass and retry.",
    retryable: false,
  },
  HOSTED_IMAGE_TOO_LARGE: {
    status: 422,
    title: "The hosted image cannot meet the size limit",
    detail: "Download the image locally or generate it again.",
    retryable: false,
  },
  UPLOAD_NOT_READY: {
    status: 409,
    title: "The pass upload is not ready",
    detail: "Wait for the image upload to finish, then retry.",
    retryable: true,
  },
  RATE_LIMITED: {
    status: 429,
    title: "Too many share requests",
    detail: "Wait briefly before trying again.",
    retryable: true,
  },
  SERVICE_BUSY: {
    status: 503,
    title: "The image service is busy",
    detail: "Wait briefly before trying again.",
    retryable: true,
  },
  IMAGE_PROCESSING_TIMEOUT: {
    status: 503,
    title: "The image took too long to process",
    detail: "Generate the Builder Pass again and retry.",
    retryable: true,
  },
  SHARE_STORAGE_UNAVAILABLE: {
    status: 503,
    title: "Share storage is temporarily unavailable",
    detail: "Your local image is safe. Wait briefly before trying again.",
    retryable: true,
  },
  SHARE_NOT_FOUND: {
    status: 404,
    title: "The shared Builder Pass was not found",
    detail: "The link may be invalid or may have expired.",
    retryable: false,
  },
  ROUTE_NOT_FOUND: {
    status: 404,
    title: "The requested route was not found",
    detail: "Check the address and retry.",
    retryable: false,
  },
  INTERNAL_ERROR: {
    status: 500,
    title: "The server could not complete the request",
    detail: "Wait briefly before trying again.",
    retryable: true,
  },
});

export interface AppErrorOptions {
  readonly detail?: string;
  readonly retryAfterSeconds?: number;
  readonly cause?: unknown;
}

export interface ProblemDocument {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly code: ProblemCode;
  readonly requestId: string;
  readonly retryable: boolean;
}

export class AppError extends Error {
  override readonly name = "AppError";
  readonly code: ProblemCode;
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | undefined;

  constructor(code: ProblemCode, options: AppErrorOptions = {}) {
    const definition = PROBLEMS[code];
    super(options.detail ?? definition.detail, { cause: options.cause });
    this.code = code;
    this.status = definition.status;
    this.title = definition.title;
    this.detail = options.detail ?? definition.detail;
    this.retryable = definition.retryable;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function toProblemDocument(
  error: AppError,
  requestId: string,
): ProblemDocument {
  return {
    type: `urn:hhgoa:problem:${error.code.toLowerCase().replaceAll("_", "-")}`,
    title: error.title,
    status: error.status,
    detail: error.detail,
    code: error.code,
    requestId,
    retryable: error.retryable,
  };
}
