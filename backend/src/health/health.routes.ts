import type { FastifyInstance } from "fastify";

import type { ReadinessService } from "./readiness.js";

export interface HealthRouteOptions {
  readonly readiness: ReadinessService;
}

export async function registerHealthRoutes(
  app: FastifyInstance,
  options: HealthRouteOptions,
): Promise<void> {
  app.get(
    "/healthz",
    {
      schema: {
        operationId: "getLiveness",
        summary: "Check process liveness",
        description:
          "Returns successfully when the HTTP process is alive. It does not check storage.",
        tags: ["Health"],
        response: {
          200: {
            description: "The process is alive.",
            type: "object",
            additionalProperties: false,
            required: ["status"],
            properties: { status: { const: "ok" } },
          },
        },
      },
    },
    async (_request, reply) => {
      reply.header("Cache-Control", "no-store");
      return { status: "ok" };
    },
  );

  app.get(
    "/readyz",
    {
      schema: {
        operationId: "getReadiness",
        summary: "Check service readiness",
        description:
          "Checks whether the service and its Vercel Blob store can serve traffic.",
        tags: ["Health"],
        response: {
          200: {
            description: "The service is ready.",
            type: "object",
            additionalProperties: false,
            required: ["status"],
            properties: { status: { const: "ready" } },
          },
          503: {
            description: "The service or storage is not ready.",
            type: "object",
            additionalProperties: false,
            required: ["status"],
            properties: { status: { const: "not_ready" } },
          },
        },
      },
    },
    async (_request, reply) => {
      const ready = await options.readiness.isReady();
      reply.header("Cache-Control", "no-store");
      if (!ready) {
        return reply.code(503).send({ status: "not_ready" });
      }
      return { status: "ready" };
    },
  );
}
