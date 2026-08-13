import { createHash, randomBytes } from "node:crypto";

import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

import type { AppConfig } from "../config/env.js";
import { AppError } from "../core/app-error.js";

export async function registerRateLimit(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  const ephemeralKey = randomBytes(32);

  await app.register(rateLimit, {
    global: false,
    max: config.rateLimitShareMax,
    timeWindow: config.rateLimitShareWindowMs,
    keyGenerator(request) {
      return createHash("sha256")
        .update(ephemeralKey)
        .update(request.ip)
        .digest("base64url");
    },
    errorResponseBuilder(_request, context) {
      return new AppError("RATE_LIMITED", {
        retryAfterSeconds: Math.max(1, Math.ceil(context.ttl / 1000)),
      });
    },
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    if (reply.statusCode === 429) {
      reply.type("application/problem+json").header("Cache-Control", "no-store");
    }
    return payload;
  });
}
