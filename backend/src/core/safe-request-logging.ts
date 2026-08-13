import { performance } from "node:perf_hooks";

import type { FastifyInstance, FastifyRequest } from "fastify";

export function registerSafeRequestLogging(app: FastifyInstance): void {
  const startedAt = new WeakMap<FastifyRequest, number>();

  app.addHook("onRequest", async (request) => {
    startedAt.set(request, performance.now());
  });

  app.addHook("onResponse", async (request, reply) => {
    const start = startedAt.get(request);
    const durationMs = start === undefined ? undefined : performance.now() - start;
    request.log.info({
      event: "request_complete",
      requestId: request.id,
      method: request.method,
      route: request.routeOptions.url || "unmatched",
      statusCode: reply.statusCode,
      durationMs: durationMs === undefined ? undefined : Number(durationMs.toFixed(2)),
    });
  });
}
