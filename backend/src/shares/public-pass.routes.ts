import { createHash } from "node:crypto";

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import type { AppConfig } from "../config/env.js";
import { AppError } from "../core/app-error.js";
import type { PublicPass } from "./pass.contract.js";
import type { PassPublicationService } from "./pass-publication-service.js";
import {
  renderSharePage,
  SHARE_PAGE_STYLE_CSP_SOURCE,
} from "./share-page-renderer.js";

const PAGE_CACHE_CONTROL = "public, max-age=300, s-maxage=3600";
const REDIRECT_CACHE_CONTROL = "public, max-age=300, s-maxage=3600";

interface PassParams {
  readonly shareId: string;
}

export interface PublicPassRouteOptions {
  readonly config: AppConfig;
  readonly service: PassPublicationService;
}

function ifNoneMatchIncludes(value: string | string[] | undefined, etag: string) {
  if (value === undefined) {
    return false;
  }
  const tags = (Array.isArray(value) ? value.join(",") : value)
    .split(",")
    .map((tag) => tag.trim());
  const comparableEtag = etag.replace(/^W\//u, "");
  return tags.some(
    (tag) => tag === "*" || tag.replace(/^W\//u, "") === comparableEtag,
  );
}

async function requirePass(
  service: PassPublicationService,
  shareId: string,
): Promise<PublicPass> {
  const pass = await service.find(shareId);
  if (pass === null) {
    throw new AppError("SHARE_NOT_FOUND");
  }
  return pass;
}

function blobOrigin(pass: PublicPass): string {
  const cardOrigin = new URL(pass.cardUrl).origin;
  if (new URL(pass.ogImageUrl).origin !== cardOrigin) {
    throw new AppError("SHARE_STORAGE_UNAVAILABLE");
  }
  return cardOrigin;
}

function pageCsp(pass: PublicPass): string {
  return [
    "default-src 'none'",
    `img-src ${blobOrigin(pass)}`,
    `style-src ${SHARE_PAGE_STYLE_CSP_SOURCE}`,
    "script-src 'none'",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

async function servePage(
  request: FastifyRequest<{ Params: PassParams }>,
  reply: FastifyReply,
  options: PublicPassRouteOptions,
): Promise<void> {
  const pass = await requirePass(options.service, request.params.shareId);
  const body = Buffer.from(
    renderSharePage({
      shareId: pass.id,
      publicShareBaseUrl: options.config.publicShareBaseUrl,
      publicAppUrl: options.config.publicAppUrl,
      cardUrl: pass.cardUrl,
      ogImageUrl: pass.ogImageUrl,
    }),
    "utf8",
  );
  const etag = `"${createHash("sha256").update(body).digest("base64url")}"`;
  reply
    .type("text/html; charset=utf-8")
    .header("Content-Length", String(body.byteLength))
    .header("Cache-Control", PAGE_CACHE_CONTROL)
    .header("ETag", etag)
    .header("Content-Security-Policy", pageCsp(pass))
    .header("X-Content-Type-Options", "nosniff")
    .header("Referrer-Policy", "no-referrer")
    .header("X-Frame-Options", "DENY");
  if (ifNoneMatchIncludes(request.headers["if-none-match"], etag)) {
    await reply.code(304).send();
    return;
  }
  await reply.send(body);
}

async function redirectArtifact(
  request: FastifyRequest<{ Params: PassParams }>,
  reply: FastifyReply,
  service: PassPublicationService,
  artifact: "card" | "og",
): Promise<void> {
  const pass = await requirePass(service, request.params.shareId);
  const location = artifact === "card" ? pass.cardUrl : pass.ogImageUrl;
  await reply
    .code(307)
    .header("Location", location)
    .header("Cache-Control", REDIRECT_CACHE_CONTROL)
    .header("X-Content-Type-Options", "nosniff")
    .send();
}

export const publicPassRoutes: FastifyPluginAsync<PublicPassRouteOptions> =
  async (app, options) => {
    app.get<{ Params: PassParams }>(
      "/pass/:shareId",
      {
        schema: {
          operationId: "getPublicPass",
          summary: "Get a public Builder Pass page",
          description:
            "Returns small crawler-ready HTML whose Open Graph and X image tags point directly at immutable public Blob objects.",
          tags: ["Public passes"],
        },
      },
      async (request, reply) => servePage(request, reply, options),
    );
    app.get<{ Params: PassParams }>(
      "/pass/:shareId/card.png",
      {
        schema: {
          operationId: "redirectPublicPassCard",
          summary: "Redirect to the immutable public card PNG",
          tags: ["Public passes"],
        },
      },
      async (request, reply) =>
        redirectArtifact(request, reply, options.service, "card"),
    );
    app.get<{ Params: PassParams }>(
      "/pass/:shareId/og.jpg",
      {
        schema: {
          operationId: "redirectPublicPassOg",
          summary: "Redirect to the immutable public OG JPEG",
          tags: ["Public passes"],
        },
      },
      async (request, reply) =>
        redirectArtifact(request, reply, options.service, "og"),
    );
  };
