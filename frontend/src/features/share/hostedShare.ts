import { uploadPresigned as uploadToVercelBlob } from "@vercel/blob/client";

import {
  isShareProblemCode,
  SHARE_IMAGE_MIME_TYPE,
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_WIDTH,
  SHARE_MAXIMUM_SIZE_IN_BYTES,
  SHARE_TEMPLATE_ID,
  SHARE_TEMPLATE_VERSION,
  type HostedShare,
  type HostedShareUpload,
  type ShareProblemCode,
} from "./shareContract";
import {
  assertPngBlob,
  isRecord,
  parseHttpUrl,
  readPngDimensions,
} from "./shareValidation";

export type HostedShareErrorKind =
  | "input"
  | "network"
  | "http"
  | "invalid-response";

export type HostedShareClientErrorCode =
  | "INVALID_PNG_BLOB"
  | "INVALID_BACKEND_ORIGIN"
  | "PAYLOAD_TOO_LARGE"
  | "NETWORK_ERROR"
  | "UPLOAD_ABORTED"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE";

export interface RetryAfter {
  readonly raw: string;
  readonly seconds: number;
  readonly retryAt: number;
}

interface HostedShareErrorOptions {
  readonly kind: HostedShareErrorKind;
  readonly code: HostedShareClientErrorCode | ShareProblemCode;
  readonly detail: string;
  readonly status?: number;
  readonly requestId?: string;
  readonly retryable: boolean;
  readonly retryAfter?: RetryAfter;
  readonly serverCode?: string;
  readonly cause?: unknown;
}

export class HostedShareError extends Error {
  override readonly name = "HostedShareError";
  readonly kind: HostedShareErrorKind;
  readonly code: HostedShareClientErrorCode | ShareProblemCode;
  readonly detail: string;
  readonly status: number | undefined;
  readonly requestId: string | undefined;
  readonly retryable: boolean;
  readonly retryAfter: RetryAfter | undefined;
  readonly serverCode: string | undefined;

  constructor(options: HostedShareErrorOptions) {
    super(options.detail, { cause: options.cause });
    this.kind = options.kind;
    this.code = options.code;
    this.detail = options.detail;
    this.status = options.status;
    this.requestId = options.requestId;
    this.retryable = options.retryable;
    this.retryAfter = options.retryAfter;
    this.serverCode = options.serverCode;
  }
}

export interface DirectBlobUploadResult {
  readonly pathname: string;
  readonly contentType: string;
  readonly url: string;
  readonly downloadUrl: string;
}

export interface DirectBlobUploadOptions {
  readonly access: "public";
  readonly handleUploadUrl: string;
  readonly clientPayload: string;
  readonly multipart: true;
  readonly contentType: "image/png";
  readonly abortSignal?: AbortSignal;
}

export type DirectBlobUploader = (
  pathname: string,
  body: Blob,
  options: DirectBlobUploadOptions,
) => Promise<DirectBlobUploadResult>;

export interface CreateHostedShareOptions {
  readonly backendOrigin: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly upload?: DirectBlobUploader;
  readonly signal?: AbortSignal;
  readonly now?: () => number;
}

interface ParsedProblem {
  readonly detail: string | undefined;
  readonly code: ShareProblemCode | undefined;
  readonly serverCode: string | undefined;
  readonly requestId: string | undefined;
  readonly retryable: boolean | undefined;
}

interface HostedShareUploadResponse {
  readonly upload: HostedShareUpload;
}

interface HostedShareResponse {
  readonly pass: HostedShare;
}

const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export function parseRetryAfter(
  value: string | null,
  now: () => number = Date.now,
): RetryAfter | undefined {
  if (value === null) {
    return undefined;
  }

  const raw = value.trim();
  if (raw === "") {
    return undefined;
  }

  const currentTime = now();
  if (!Number.isFinite(currentTime)) {
    return undefined;
  }

  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    const retryAt = currentTime + seconds * 1_000;
    if (!Number.isSafeInteger(seconds) || !Number.isFinite(retryAt)) {
      return undefined;
    }
    return { raw, seconds, retryAt };
  }

  if (/^-?\d+(?:\.\d+)?$/.test(raw)) {
    return undefined;
  }

  const retryAt = Date.parse(raw);
  if (!Number.isFinite(retryAt)) {
    return undefined;
  }

  return {
    raw,
    seconds: Math.max(0, Math.ceil((retryAt - currentTime) / 1_000)),
    retryAt,
  };
}

function parseBackendOrigin(backendOrigin: string): URL | undefined {
  const trimmedOrigin = backendOrigin.trim();
  if (trimmedOrigin === "") {
    return undefined;
  }

  const parsedOrigin = parseHttpUrl(trimmedOrigin, "Backend origin");
  if (
    (parsedOrigin.pathname !== "" && parsedOrigin.pathname !== "/") ||
    parsedOrigin.search !== "" ||
    parsedOrigin.hash !== ""
  ) {
    throw new TypeError("Backend origin cannot include a path, query, or hash.");
  }

  return parsedOrigin;
}

export function buildHostedShareEndpoint(backendOrigin: string): string {
  const parsedOrigin = parseBackendOrigin(backendOrigin);
  return parsedOrigin === undefined
    ? "/v2/pass-uploads"
    : `${parsedOrigin.origin}/v2/pass-uploads`;
}

function parseProblem(payload: unknown): ParsedProblem | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const serverCode =
    typeof payload.code === "string" && payload.code !== ""
      ? payload.code
      : undefined;

  return {
    detail:
      typeof payload.detail === "string" && payload.detail !== ""
        ? payload.detail
        : undefined,
    code: isShareProblemCode(payload.code) ? payload.code : undefined,
    serverCode,
    requestId:
      typeof payload.requestId === "string" && payload.requestId !== ""
        ? payload.requestId
        : undefined,
    retryable:
      typeof payload.retryable === "boolean" ? payload.retryable : undefined,
  };
}

function hasExpectedTemplate(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.id === SHARE_TEMPLATE_ID &&
    value.version === SHARE_TEMPLATE_VERSION
  );
}

function isSafeAbsoluteUrl(
  value: unknown,
  label: string,
  requiredProtocol?: "https:",
): value is string {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const parsed = parseHttpUrl(value, label);
    return requiredProtocol === undefined || parsed.protocol === requiredProtocol;
  } catch {
    return false;
  }
}

function isHostedShareUploadResponse(
  payload: unknown,
): payload is HostedShareUploadResponse {
  if (!isRecord(payload) || !isRecord(payload.upload)) {
    return false;
  }

  const upload = payload.upload;
  return (
    typeof upload.id === "string" &&
    SHARE_ID_PATTERN.test(upload.id) &&
    typeof upload.pathname === "string" &&
    upload.pathname.endsWith(`/${upload.id}/source.png`) &&
    !upload.pathname.startsWith("/") &&
    !upload.pathname.includes("..") &&
    isSafeAbsoluteUrl(upload.tokenUrl, "Blob upload authorization URL") &&
    isSafeAbsoluteUrl(upload.finalizeUrl, "Pass finalization URL") &&
    upload.access === "public" &&
    upload.contentType === SHARE_IMAGE_MIME_TYPE &&
    upload.maximumSizeInBytes === SHARE_MAXIMUM_SIZE_IN_BYTES &&
    upload.multipart === true &&
    hasExpectedTemplate(upload.template)
  );
}

function isHostedShareResponse(payload: unknown): payload is HostedShareResponse {
  if (!isRecord(payload) || !isRecord(payload.pass)) {
    return false;
  }

  const pass = payload.pass;
  if (
    typeof pass.id === "string" &&
    SHARE_ID_PATTERN.test(pass.id) &&
    isSafeAbsoluteUrl(pass.url, "Hosted pass URL") &&
    isSafeAbsoluteUrl(pass.cardUrl, "Hosted card URL", "https:") &&
    isSafeAbsoluteUrl(pass.ogImageUrl, "Hosted OG image URL", "https:") &&
    hasExpectedTemplate(pass.template) &&
    Number.isInteger(pass.retentionDays) &&
    typeof pass.retentionDays === "number" &&
    pass.retentionDays >= 1 &&
    typeof pass.scheduledDeletionAfter === "string" &&
    Number.isFinite(Date.parse(pass.scheduledDeletionAfter))
  ) {
    const passUrl = new URL(pass.url);
    const cardUrl = new URL(pass.cardUrl);
    const ogImageUrl = new URL(pass.ogImageUrl);
    return (
      passUrl.pathname === `/pass/${pass.id}` &&
      passUrl.search === "" &&
      passUrl.hash === "" &&
      cardUrl.pathname.endsWith(`/passes/${pass.id}/card.png`) &&
      ogImageUrl.pathname.endsWith(`/passes/${pass.id}/og.jpg`)
    );
  }
  return false;
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const body = await response.text();
  if (body.trim() === "") {
    return undefined;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
}

function defaultRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === "AbortError";
}

function inputError(
  code:
    | "INVALID_PNG_BLOB"
    | "INVALID_BACKEND_ORIGIN"
    | "INVALID_IMAGE_DIMENSIONS"
    | "PAYLOAD_TOO_LARGE",
  detail: string,
  cause?: unknown,
): HostedShareError {
  return new HostedShareError({
    kind: "input",
    code,
    detail,
    retryable: false,
    cause,
  });
}

function networkError(error: unknown): HostedShareError {
  const aborted = isAbortError(error);
  return new HostedShareError({
    kind: "network",
    code: aborted ? "UPLOAD_ABORTED" : "NETWORK_ERROR",
    detail: aborted
      ? "The public-link upload was cancelled."
      : "The public link could not be created. Check your connection and retry.",
    retryable: !aborted,
    cause: error,
  });
}

async function requestJson(
  endpoint: string,
  init: RequestInit,
  options: CreateHostedShareOptions,
  acceptedStatuses: ReadonlySet<number>,
): Promise<unknown> {
  const fetchRequest = options.fetch ?? globalThis.fetch;
  let response: Response;
  try {
    response = await fetchRequest(endpoint, init);
  } catch (error) {
    throw networkError(error);
  }

  let payload: unknown;
  try {
    payload = await readResponsePayload(response);
  } catch (error) {
    throw new HostedShareError({
      kind: "invalid-response",
      code: "INVALID_RESPONSE",
      detail: "The hosted-share service returned an unreadable response.",
      status: response.status,
      retryable: true,
      cause: error,
    });
  }

  if (!response.ok) {
    const problem = parseProblem(payload);
    const retryAfter = parseRetryAfter(
      response.headers.get("Retry-After"),
      options.now,
    );
    throw new HostedShareError({
      kind: "http",
      code: problem?.code ?? "HTTP_ERROR",
      serverCode: problem?.serverCode,
      detail:
        problem?.detail ??
        `The hosted-share service rejected the request (${String(response.status)}).`,
      status: response.status,
      requestId: problem?.requestId,
      retryable:
        problem?.retryable ?? defaultRetryableStatus(response.status),
      retryAfter,
    });
  }

  if (!acceptedStatuses.has(response.status)) {
    throw new HostedShareError({
      kind: "invalid-response",
      code: "INVALID_RESPONSE",
      detail: "The hosted-share service returned an unexpected success status.",
      status: response.status,
      retryable: true,
    });
  }

  return payload;
}

function createEmptyPost(signal: AbortSignal | undefined): RequestInit {
  const request: RequestInit = { method: "POST" };
  if (signal !== undefined) {
    request.signal = signal;
  }
  return request;
}

/**
 * Publishes only the flattened card PNG. The browser receives a narrow,
 * short-lived presigned upload URL through the backend, then sends the image
 * straight to Vercel Blob before asking the backend to finalize the immutable
 * pass.
 */
export async function createHostedShare(
  pngBlob: Blob,
  options: CreateHostedShareOptions,
): Promise<HostedShare> {
  try {
    assertPngBlob(pngBlob);
  } catch (error) {
    throw inputError(
      "INVALID_PNG_BLOB",
      "Sharing requires a non-empty generated PNG.",
      error,
    );
  }

  if (pngBlob.size > SHARE_MAXIMUM_SIZE_IN_BYTES) {
    throw inputError(
      "PAYLOAD_TOO_LARGE",
      "The generated PNG is too large to publish. Download it and try generating again.",
    );
  }

  let dimensions: { readonly width: number; readonly height: number };
  try {
    dimensions = await readPngDimensions(pngBlob);
  } catch (error) {
    throw inputError(
      "INVALID_PNG_BLOB",
      "Sharing requires a generated PNG with a valid image header.",
      error,
    );
  }
  if (
    dimensions.width !== SHARE_IMAGE_WIDTH ||
    dimensions.height !== SHARE_IMAGE_HEIGHT
  ) {
    throw inputError(
      "INVALID_IMAGE_DIMENSIONS",
      `The generated PNG must be exactly ${String(SHARE_IMAGE_WIDTH)} by ${String(SHARE_IMAGE_HEIGHT)} pixels.`,
    );
  }

  let endpoint: string;
  try {
    endpoint = buildHostedShareEndpoint(options.backendOrigin);
  } catch (error) {
    throw inputError(
      "INVALID_BACKEND_ORIGIN",
      "The hosted-share service is not configured correctly.",
      error,
    );
  }

  const initiationPayload = await requestJson(
    endpoint,
    createEmptyPost(options.signal),
    options,
    new Set([201]),
  );
  if (!isHostedShareUploadResponse(initiationPayload)) {
    throw new HostedShareError({
      kind: "invalid-response",
      code: "INVALID_RESPONSE",
      detail: "The hosted-share service returned an invalid upload contract.",
      status: 201,
      retryable: true,
    });
  }

  const upload = initiationPayload.upload;
  const directUpload = options.upload ?? uploadToVercelBlob;
  try {
    await directUpload(upload.pathname, pngBlob, {
      access: upload.access,
      handleUploadUrl: upload.tokenUrl,
      clientPayload: upload.id,
      multipart: upload.multipart,
      contentType: upload.contentType,
      ...(options.signal === undefined ? {} : { abortSignal: options.signal }),
    });
  } catch (error) {
    throw networkError(error);
  }

  const finalizedPayload = await requestJson(
    upload.finalizeUrl,
    createEmptyPost(options.signal),
    options,
    new Set([200, 201]),
  );
  if (!isHostedShareResponse(finalizedPayload)) {
    throw new HostedShareError({
      kind: "invalid-response",
      code: "INVALID_RESPONSE",
      detail: "The hosted-share service returned an invalid public pass.",
      status: 201,
      retryable: true,
    });
  }

  if (finalizedPayload.pass.id !== upload.id) {
    throw new HostedShareError({
      kind: "invalid-response",
      code: "INVALID_RESPONSE",
      detail: "The hosted-share service returned a mismatched public pass.",
      status: 201,
      retryable: true,
    });
  }

  return finalizedPayload.pass;
}
