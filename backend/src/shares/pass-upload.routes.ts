import type { IncomingMessage } from "node:http";

import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import {
  issueSignedToken,
  type PutBlobResult,
} from "@vercel/blob";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

import type { AppConfig } from "../config/env.js";
import {
  BLOB_PATHS,
  CLIENT_UPLOAD_TOKEN_LIFETIME_MS,
  SHARE_IMAGE_CONTRACT,
  TEMPLATE_CONTRACT,
} from "../config/constants.js";
import { AppError } from "../core/app-error.js";
import {
  PASS_UPLOAD_SCHEMA,
  PUBLIC_PASS_SCHEMA,
  type PassUploadInstructions,
} from "./pass.contract.js";
import type { PassPublicationService } from "./pass-publication-service.js";
import { createShareId, isShareId } from "./share-id.js";
import { assertAllowedOrigin } from "./origin-validation.js";

const TOKEN_BODY_LIMIT = 64 * 1024;

interface FinalizeParams {
  readonly uploadId: string;
}

export interface ClientUploadHandlerPort {
  handle(request: IncomingMessage, body: unknown): Promise<unknown>;
}

function absoluteUrl(baseUrl: string, path: string): string {
  return new URL(path, `${baseUrl}/`).href;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function eventType(body: unknown): string | null {
  return isRecord(body) && typeof body.type === "string" ? body.type : null;
}

function assertEmptyBody(request: FastifyRequest): void {
  if (
    request.body !== undefined &&
    request.body !== null &&
    !(Buffer.isBuffer(request.body) && request.body.byteLength === 0)
  ) {
    throw new AppError("INVALID_REQUEST");
  }
}

function isPublicBlobUrl(value: string, pathname: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com") &&
      url.pathname.endsWith(`/${pathname}`)
    );
  } catch {
    return false;
  }
}

export function clientUploadPolicy(
  pathname: string,
  clientPayload: string | null,
  multipart: boolean,
  now: number,
  callbackUrl: string,
) {
  if (
    clientPayload === null ||
    !isShareId(clientPayload) ||
    pathname !== BLOB_PATHS.staging(clientPayload) ||
    multipart !== true
  ) {
    throw new AppError("INVALID_REQUEST");
  }
  return {
    allowedContentTypes: [SHARE_IMAGE_CONTRACT.mimeType],
    maximumSizeInBytes: SHARE_IMAGE_CONTRACT.maxInputBytes,
    validUntil: now + CLIENT_UPLOAD_TOKEN_LIFETIME_MS,
    addRandomSuffix: false,
    allowOverwrite: false,
    cacheControlMaxAge: 60,
    tokenPayload: clientPayload,
    callbackUrl,
  };
}

export function assertCompletedUpload(
  blob: PutBlobResult,
  tokenPayload: string | null | undefined,
): void {
  if (
    tokenPayload === null ||
    tokenPayload === undefined ||
    !isShareId(tokenPayload) ||
    blob.pathname !== BLOB_PATHS.staging(tokenPayload) ||
    blob.contentType !== SHARE_IMAGE_CONTRACT.mimeType ||
    !isPublicBlobUrl(blob.url, blob.pathname)
  ) {
    throw new AppError("INVALID_REQUEST");
  }
}

export class VercelClientUploadHandler implements ClientUploadHandlerPort {
  readonly #token: string | undefined;
  readonly #storeId: string | undefined;
  readonly #webhookPublicKey: string;
  readonly #callbackUrl: string;
  readonly #now: () => number;

  constructor(options: {
    readonly token?: string | undefined;
    readonly storeId?: string | undefined;
    readonly webhookPublicKey: string;
    readonly publicShareBaseUrl: string;
    readonly now?: () => number;
  }) {
    this.#token = options.token;
    this.#storeId = options.storeId;
    this.#webhookPublicKey = options.webhookPublicKey;
    this.#callbackUrl = absoluteUrl(
      options.publicShareBaseUrl,
      "/v2/pass-uploads/token",
    );
    this.#now = options.now ?? Date.now;
  }

  async handle(request: IncomingMessage, body: unknown): Promise<unknown> {
    try {
      return await handleUploadPresigned({
        request,
        body: body as HandleUploadPresignedBody,
        webhookPublicKey: this.#webhookPublicKey,
        getSignedToken: async (
          pathname,
          clientPayload,
          multipart,
        ) => {
          const policy = clientUploadPolicy(
            pathname,
            clientPayload,
            multipart,
            this.#now(),
            this.#callbackUrl,
          );
          const token = await issueSignedToken({
            pathname,
            operations: ["put"],
            validUntil: policy.validUntil,
            allowedContentTypes: policy.allowedContentTypes,
            maximumSizeInBytes: policy.maximumSizeInBytes,
            ...(this.#token === undefined ? {} : { token: this.#token }),
            ...(this.#storeId === undefined ? {} : { storeId: this.#storeId }),
          });
          return { token, urlOptions: policy };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          assertCompletedUpload(blob, tokenPayload);
          // Finalization reads the deterministic staging key directly. This
          // callback is validation-only and is never on the critical path.
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("INVALID_REQUEST", { cause: error });
    }
  }
}

export interface PassUploadRouteOptions {
  readonly config: AppConfig;
  readonly service: PassPublicationService;
  readonly clientUploadHandler: ClientUploadHandlerPort;
  readonly generateId?: () => string;
}

const uploadResponseSchema = {
  description: "Direct-to-Blob upload instructions for one Builder Pass.",
  type: "object",
  additionalProperties: false,
  required: ["upload"],
  properties: { upload: PASS_UPLOAD_SCHEMA },
} as const;

const finalizeResponseSchema = {
  description: "The immutable public Builder Pass.",
  type: "object",
  additionalProperties: false,
  required: ["pass"],
  properties: { pass: PUBLIC_PASS_SCHEMA },
} as const;

export const passUploadRoutes: FastifyPluginAsync<PassUploadRouteOptions> =
  async (app, options) => {
    const generateId = options.generateId ?? createShareId;
    const rateLimit = {
      max: options.config.rateLimitShareMax,
      timeWindow: options.config.rateLimitShareWindowMs,
    };

    app.post(
      "/v2/pass-uploads",
      {
        bodyLimit: 1,
        config: { rateLimit },
        schema: {
          operationId: "createPassUpload",
          summary: "Begin a direct Builder Pass upload",
          description:
            "Returns a deterministic staging path and endpoints for a browser-to-Vercel-Blob upload. The PNG bytes never cross this Function.",
          tags: ["Pass uploads"],
          response: { 201: uploadResponseSchema },
        },
      },
      async (request, reply) => {
        assertAllowedOrigin(request, options.config, false);
        assertEmptyBody(request);
        const id = generateId();
        if (!isShareId(id)) {
          throw new AppError("INTERNAL_ERROR");
        }
        const upload: PassUploadInstructions = {
          id,
          pathname: BLOB_PATHS.staging(id),
          tokenUrl: absoluteUrl(
            options.config.publicShareBaseUrl,
            "/v2/pass-uploads/token",
          ),
          finalizeUrl: absoluteUrl(
            options.config.publicShareBaseUrl,
            `/v2/pass-uploads/${encodeURIComponent(id)}/finalize`,
          ),
          access: "public",
          contentType: SHARE_IMAGE_CONTRACT.mimeType,
          maximumSizeInBytes: SHARE_IMAGE_CONTRACT.maxInputBytes,
          multipart: true,
          template: TEMPLATE_CONTRACT,
        };
        return reply
          .code(201)
          .header("Cache-Control", "no-store")
          .send({ upload });
      },
    );

    app.post(
      "/v2/pass-uploads/token",
      {
        bodyLimit: TOKEN_BODY_LIMIT,
        config: { rateLimit },
        schema: {
          operationId: "handlePassBlobUpload",
          summary: "Issue a scoped Vercel Blob presigned upload URL",
          description:
            "Used by @vercel/blob/client for presigned upload authorization and its signed completion callback.",
          tags: ["Pass uploads"],
        },
      },
      async (request, reply) => {
        const type = eventType(request.body);
        if (type === "blob.generate-presigned-url") {
          assertAllowedOrigin(request, options.config, false);
        } else if (type === "blob.upload-completed") {
          assertAllowedOrigin(request, options.config, true);
        } else {
          throw new AppError("INVALID_REQUEST");
        }
        const response = await options.clientUploadHandler.handle(
          request.raw,
          request.body,
        );
        return reply
          .code(200)
          .header("Cache-Control", "no-store")
          .send(response);
      },
    );

    app.post<{ Params: FinalizeParams }>(
      "/v2/pass-uploads/:uploadId/finalize",
      {
        bodyLimit: 1,
        config: { rateLimit },
        schema: {
          operationId: "finalizePassUpload",
          summary: "Validate and publish a Builder Pass",
          description:
            "Reads the short-lived public staging key, sanitizes the canonical PNG, creates an OG image, and publishes a manifest last as the commit marker.",
          tags: ["Pass uploads"],
          params: {
            type: "object",
            additionalProperties: false,
            required: ["uploadId"],
            properties: {
              uploadId: {
                type: "string",
                pattern: "^[A-Za-z0-9_-]{32}$",
              },
            },
          },
          response: {
            200: finalizeResponseSchema,
            201: finalizeResponseSchema,
          },
        },
      },
      async (request, reply) => {
        assertAllowedOrigin(request, options.config, false);
        assertEmptyBody(request);
        const result = await options.service.finalize(request.params.uploadId);
        return reply
          .code(result.created ? 201 : 200)
          .header("Location", result.pass.url)
          .header("Cache-Control", "no-store")
          .send({ pass: result.pass });
      },
    );
  };
