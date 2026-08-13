import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";

import type { AppConfig } from "../config/env.js";

export async function registerSecurityHeaders(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts:
      config.environment === "production"
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: false }
        : false,
    referrerPolicy: { policy: "no-referrer" },
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    );
    return payload;
  });
}
