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
  try {
    const parsedOrigin = new URL(origin);
    const forwardedHost = typeof request.headers["x-forwarded-host"] === "string"
      ? request.headers["x-forwarded-host"].split(",")[0]?.trim()
      : undefined;
    const hostHeader =
      forwardedHost ||
      request.host ||
      (typeof request.headers.host === "string" ? request.headers.host : "");
    if (!hostHeader) {
      return false;
    }
    const requestHost = hostHeader.split(":")[0]?.toLowerCase();
    const originHost = parsedOrigin.hostname.toLowerCase();

    if (requestHost === originHost) {
      return true;
    }
    if (
      originHost !== undefined &&
      originHost.endsWith(".vercel.app") &&
      (requestHost === undefined || requestHost.endsWith(".vercel.app") || requestHost === "")
    ) {
      return true;
    }
    return false;
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
  if (origins.length > 1) {
    throw new AppError("ORIGIN_NOT_ALLOWED");
  }

  const origin = origins[0];
  if (origin === undefined || origin === "") {
    if (allowMissing) {
      return;
    }
    const referer =
      typeof request.headers.referer === "string"
        ? request.headers.referer
        : undefined;
    if (referer !== undefined && isSameOriginRequest(request, referer)) {
      return;
    }
    if (
      request.headers.host !== undefined ||
      request.headers["x-forwarded-host"] !== undefined
    ) {
      return;
    }
    throw new AppError("ORIGIN_NOT_ALLOWED");
  }

  if (
    !config.corsAllowedOrigins.includes(origin) &&
    !isSameOriginRequest(request, origin)
  ) {
    throw new AppError("ORIGIN_NOT_ALLOWED");
  }
}
