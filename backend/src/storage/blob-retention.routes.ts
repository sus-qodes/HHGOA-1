import { timingSafeEqual } from "node:crypto";

import type { FastifyPluginAsync } from "fastify";

import type { AppConfig } from "../config/env.js";
import { STAGING_RETENTION_HOURS } from "../config/constants.js";
import { AppError } from "../core/app-error.js";
import type { PassBlobStoragePort } from "./vercel-blob-pass-storage.js";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export interface BlobRetentionRouteOptions {
  readonly config: AppConfig;
  readonly storage: PassBlobStoragePort;
  readonly now?: () => Date;
}

function authorized(header: string | undefined, secret: string): boolean {
  if (header === undefined || !header.startsWith("Bearer ")) {
    return false;
  }
  const supplied = Buffer.from(header.slice("Bearer ".length), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return (
    supplied.byteLength === expected.byteLength &&
    timingSafeEqual(supplied, expected)
  );
}

export const blobRetentionRoutes: FastifyPluginAsync<
  BlobRetentionRouteOptions
> = async (app, options) => {
  app.get(
    "/internal/cron/retention",
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      if (
        options.config.cronSecret === undefined ||
        !authorized(request.headers.authorization, options.config.cronSecret)
      ) {
        throw new AppError("UNAUTHORIZED");
      }
      const now = (options.now ?? (() => new Date()))();
      const publishedBefore = new Date(
        now.getTime() -
          options.config.retentionDays * MILLISECONDS_PER_DAY,
      );
      const stagingBefore = new Date(
        now.getTime() - STAGING_RETENTION_HOURS * MILLISECONDS_PER_HOUR,
      );
      let result;
      try {
        result = await options.storage.removeExpired(
          publishedBefore,
          stagingBefore,
          1000,
        );
      } catch (error) {
        throw new AppError("SHARE_STORAGE_UNAVAILABLE", { cause: error });
      }
      return reply
        .code(200)
        .header("Cache-Control", "no-store")
        .send({ ok: true, result });
    },
  );
};
