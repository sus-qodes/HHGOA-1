import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import Fastify, { LogController } from "fastify";
import type {
  FastifyInstance,
  FastifyServerOptions,
  RawServerDefault,
} from "fastify";

import type { AppConfig } from "./config/env.js";
import { loadConfig } from "./config/env.js";
import {
  handleFrameworkError,
  registerErrorHandling,
} from "./core/error-handler.js";
import { registerSafeRequestLogging } from "./core/safe-request-logging.js";
import { registerHealthRoutes } from "./health/health.routes.js";
import { ReadinessService } from "./health/readiness.js";
import type { ReadinessCheck } from "./health/readiness.js";
import { ShareImageProcessor } from "./image/share-image-processor.js";
import { registerCors } from "./plugins/cors.js";
import { registerApiDocs } from "./plugins/api-docs.js";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { registerSecurityHeaders } from "./plugins/security-headers.js";
import { publicPassRoutes } from "./shares/public-pass.routes.js";
import {
  PassPublicationService,
  type ShareImageProcessorPort,
} from "./shares/pass-publication-service.js";
import {
  passUploadRoutes,
  VercelClientUploadHandler,
  type ClientUploadHandlerPort,
} from "./shares/pass-upload.routes.js";
import { blobRetentionRoutes } from "./storage/blob-retention.routes.js";
import {
  VercelBlobPassStorage,
  type PassBlobStoragePort,
} from "./storage/vercel-blob-pass-storage.js";

type LoggerOption = FastifyServerOptions<RawServerDefault>["logger"];

export interface BuildAppOptions {
  readonly config?: AppConfig;
  readonly logger?: LoggerOption;
  readonly readinessChecks?: readonly ReadinessCheck[];
  readonly blobStorage?: PassBlobStoragePort;
  readonly clientUploadHandler?: ClientUploadHandlerPort;
  readonly imageProcessor?: ShareImageProcessorPort;
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const imageProcessor =
    options.imageProcessor ?? ShareImageProcessor.fromConfig(config);
  const logger =
    options.logger ??
    (config.environment === "test"
      ? false
      : {
          level: config.logLevel,
          redact: {
            paths: [
              "req.headers.authorization",
              "req.headers.cookie",
              "req.headers.referer",
              "request.headers",
            ],
            censor: "[REDACTED]",
          },
        });

  const app = Fastify({
    logger,
    logController: new LogController({ disableRequestLogging: true }),
    genReqId: () => randomUUID(),
    trustProxy: config.trustProxyHops === 0 ? false : config.trustProxyHops,
    bodyLimit: config.shareUploadMaxBytes,
    requestTimeout: 15_000,
    connectionTimeout: 10_000,
    onProtoPoisoning: "error",
    onConstructorPoisoning: "error",
    frameworkErrors: handleFrameworkError,
  });
  registerErrorHandling(app);
  registerSafeRequestLogging(app);
  await registerSecurityHeaders(app, config);
  await registerCors(app, config);
  await registerRateLimit(app, config);
  await registerApiDocs(app);

  const token = config.blobReadWriteToken;
  const blobStorage =
    options.blobStorage ??
    new VercelBlobPassStorage({
      token,
      storeId: config.blobStoreId,
    });
  const passService = new PassPublicationService({
    config,
    storage: blobStorage,
    imageProcessor,
  });
  const clientUploadHandler =
    options.clientUploadHandler ??
    new VercelClientUploadHandler({
      token,
      storeId: config.blobStoreId,
      webhookPublicKey: config.blobWebhookPublicKey,
      publicShareBaseUrl: config.publicShareBaseUrl,
    });
  await app.register(passUploadRoutes, {
    config,
    service: passService,
    clientUploadHandler,
  });
  await app.register(publicPassRoutes, { config, service: passService });
  await app.register(blobRetentionRoutes, { config, storage: blobStorage });

  const readiness = new ReadinessService([
    async () => blobStorage.checkReady(),
    ...(options.readinessChecks ?? []),
  ]);
  await registerHealthRoutes(app, { readiness });

  await app.ready();
  return app;
}

let vercelApp: Promise<FastifyInstance> | undefined;

async function getVercelApp(): Promise<FastifyInstance> {
  if (vercelApp === undefined) {
    vercelApp = buildApp().catch((error) => {
      vercelApp = undefined;
      throw error;
    });
  }
  return vercelApp;
}

// Vercel accepts a default Node request handler. Routing directly through the
// ready Fastify instance avoids relying on its runtime's listen interception.
// Local/container startup remains in src/main.ts and still calls app.listen().
export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const app = await getVercelApp();
    app.routing(request, response);
  } catch (error) {
    console.error("Vercel Serverless Function error:", error);
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          error: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Initialization failed",
          detail: String(error),
        }),
      );
    }
  }
}
