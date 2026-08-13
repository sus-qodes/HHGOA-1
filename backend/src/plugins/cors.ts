import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

import type { AppConfig } from "../config/env.js";

export async function registerCors(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  const allowedOrigins = new Set(config.corsAllowedOrigins);
  await app.register(cors, {
    origin(origin, callback) {
      callback(null, origin === undefined || allowedOrigins.has(origin));
    },
    methods: ["GET", "HEAD", "POST", "OPTIONS"],
    allowedHeaders: ["content-type"],
    credentials: false,
    maxAge: 600,
    strictPreflight: true,
  });
}
