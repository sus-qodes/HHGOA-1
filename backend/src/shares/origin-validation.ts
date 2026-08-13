import type { FastifyRequest } from "fastify";

import type { AppConfig } from "../config/env.js";
import { AppError } from "../core/app-error.js";

function rawHeaderValues(request: FastifyRequest, name: string): string[] {
  const values: string[] = [];
  const rawHeaders = request.raw.rawHeaders;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    if (rawHeaders[index]?.toLowerCase() === name) {
      values.push(rawHeaders[index + 1] ?? "");
    }
  }
  return values;
}

function isSameOriginRequest(request: FastifyRequest, origin: string): boolean {
  if (request.host.length === 0) {
    return false;
  }
  try {
    const requestOrigin = new URL(`${request.protocol}://${request.host}`).origin;
    return new URL(origin).origin === requestOrigin;
  } catch {
    return false;
  }
}

export function assertAllowedOrigin(
  request: FastifyRequest,
  config: AppConfig,
  allowMissing: boolean,
): void {
  const origins = rawHeaderValues(request, "origin");
  if (
    origins.length > 1 ||
    (origins.length === 0 && !allowMissing) ||
    (origins.length === 1 &&
      !config.corsAllowedOrigins.includes(origins[0] ?? "") &&
      !isSameOriginRequest(request, origins[0] ?? ""))
  ) {
    throw new AppError("ORIGIN_NOT_ALLOWED");
  }
}
