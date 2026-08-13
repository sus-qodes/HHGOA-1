import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance, FastifySchema } from "fastify";

import {
  SHARE_ID_LENGTH,
  SHARE_ID_PATTERN,
} from "../config/constants.js";

const API_TITLE = "HH Goa 2026 Builder Pass API";

const problemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "type",
    "title",
    "status",
    "detail",
    "code",
    "requestId",
    "retryable",
  ],
  properties: {
    type: { type: "string", format: "uri-reference" },
    title: { type: "string" },
    status: { type: "integer", minimum: 400, maximum: 599 },
    detail: { type: "string" },
    code: { type: "string", pattern: "^[A-Z][A-Z0-9_]*$" },
    requestId: { type: "string", format: "uuid" },
    retryable: { type: "boolean" },
  },
} as const;

function problemResponse(description: string, retryAfter = false) {
  return {
    description,
    headers: {
      "Cache-Control": {
        type: "string",
        example: "no-store",
        description: "Problem responses are never cached.",
      },
      ...(retryAfter
        ? {
            "Retry-After": {
              type: "integer",
              minimum: 1,
              description: "Suggested delay in seconds before retrying.",
            },
          }
        : {}),
    },
    content: {
      "application/problem+json": { schema: problemSchema },
    },
  } as const;
}

function documentationSchema(
  schema: FastifySchema,
  url: string,
): FastifySchema {
  if (
    url === "/v2/pass-uploads" ||
    url === "/v2/pass-uploads/token" ||
    url === "/v2/pass-uploads/:uploadId/finalize"
  ) {
    const runtimeResponses =
      typeof schema.response === "object" && schema.response !== null
        ? (schema.response as Record<string, unknown>)
        : {};
    return {
      ...schema,
      response: {
        ...runtimeResponses,
        ...(url === "/v2/pass-uploads/token"
          ? {
              200: {
                description:
                  "Vercel Blob client-token or signed completion response.",
                type: "object",
              },
            }
          : {}),
        400: problemResponse("The upload protocol request is invalid."),
        403: problemResponse("The browser origin is not allowed."),
        409: problemResponse("The direct upload has not completed yet.", true),
        413: problemResponse("The PNG exceeds the upload limit."),
        415: problemResponse("The staged object is not a PNG."),
        422: problemResponse("The staged image cannot be published."),
        429: problemResponse("The pass upload rate limit was exceeded.", true),
        500: problemResponse("The server could not complete the request."),
        503: problemResponse("Image processing or Blob storage is unavailable.", true),
      },
    };
  }

  if (
    url === "/pass/:shareId" ||
    url === "/pass/:shareId/card.png" ||
    url === "/pass/:shareId/og.jpg"
  ) {
    const page = url === "/pass/:shareId";
    return {
      ...schema,
      params: {
        type: "object",
        additionalProperties: false,
        required: ["shareId"],
        properties: {
          shareId: {
            type: "string",
            minLength: SHARE_ID_LENGTH,
            maxLength: SHARE_ID_LENGTH,
            pattern: SHARE_ID_PATTERN.source,
            description: "Opaque 32-character pass identifier.",
          },
        },
      },
      response: page
        ? {
            200: {
              description:
                "Crawler-ready HTML with initial Open Graph and X metadata.",
              content: {
                "text/html": { schema: { type: "string" } },
              },
            },
            304: {
              type: "null",
              description: "The cached page is still current.",
            },
            404: problemResponse("The pass is invalid, missing, or expired."),
            503: problemResponse("Blob storage is unavailable."),
          }
        : {
            307: {
              description: "Redirect to the immutable public Blob object.",
              headers: {
                Location: {
                  type: "string",
                  format: "uri",
                },
              },
            },
            404: problemResponse("The pass is invalid, missing, or expired."),
            503: problemResponse("Blob storage is unavailable."),
          },
    };
  }

  if (url === "/healthz" || url === "/readyz") {
    return { ...schema };
  }

  return { ...schema, hide: true };
}

export async function registerApiDocs(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    mode: "dynamic",
    openapi: {
      openapi: "3.0.3",
      info: {
        title: API_TITLE,
        version: "0.1.0",
        description:
          "Backend API for immutable HH Goa 2026 Builder Pass pages.",
      },
      tags: [
        { name: "Pass uploads", description: "Direct-to-Blob pass publishing." },
        { name: "Public passes", description: "Crawler-facing public passes." },
        { name: "Health", description: "Liveness and readiness probes." },
      ],
    },
    hideUntagged: true,
    exposeHeadRoutes: false,
    transform: ({ schema, url }) => ({
      schema: documentationSchema(schema, url),
      url,
    }),
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    staticCSP: true,
    validatorUrl: false,
    theme: { title: API_TITLE },
    uiConfig: {
      deepLinking: true,
      docExpansion: "list",
      displayRequestDuration: true,
      validatorUrl: null,
    },
  });
}
