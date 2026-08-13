import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";

import { AppError, toProblemDocument } from "./app-error.js";

function mapFrameworkError(error: unknown, publicSharePath: boolean): AppError {
  if (error instanceof AppError) {
    return error;
  }
  const frameworkError =
    typeof error === "object" && error !== null
      ? (error as Partial<FastifyError>)
      : {};
  if (frameworkError.code === "FST_ERR_CTP_BODY_TOO_LARGE") {
    return new AppError("PAYLOAD_TOO_LARGE");
  }
  if (frameworkError.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") {
    return new AppError("UNSUPPORTED_MEDIA_TYPE");
  }
  if (frameworkError.code === "FST_ERR_BAD_URL") {
    return new AppError(publicSharePath ? "SHARE_NOT_FOUND" : "INVALID_REQUEST");
  }
  if (frameworkError.validation !== undefined) {
    return new AppError("INVALID_REQUEST");
  }
  if (frameworkError.statusCode === 429) {
    return new AppError("RATE_LIMITED", { retryAfterSeconds: 60 });
  }
  return new AppError("INTERNAL_ERROR");
}

function safeRoute(request: FastifyRequest): string {
  return request.routeOptions.url || "unmatched";
}

function isPublicSharePath(request: FastifyRequest): boolean {
  const path = request.raw.url?.split("?", 1)[0] ?? "";
  return path === "/pass" || path.startsWith("/pass/");
}

function sendProblem(
  request: FastifyRequest,
  reply: FastifyReply,
  error: AppError,
): void {
  request.log[error.status >= 500 ? "error" : "warn"]({
    event: "request_failed",
    requestId: request.id,
    method: request.method,
    route: safeRoute(request),
    statusCode: error.status,
    code: error.code,
  });

  if (error.retryAfterSeconds !== undefined) {
    reply.header("Retry-After", String(error.retryAfterSeconds));
  }
  void reply
    .code(error.status)
    .header("Cache-Control", "no-store")
    .type("application/problem+json")
    .send(toProblemDocument(error, request.id));
}

export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    sendProblem(
      request,
      reply,
      new AppError(
        isPublicSharePath(request) ? "SHARE_NOT_FOUND" : "ROUTE_NOT_FOUND",
      ),
    );
  });

  app.setErrorHandler((error, request, reply) => {
    handleFrameworkError(error, request, reply);
  });
}

export function handleFrameworkError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  sendProblem(
    request,
    reply,
    mapFrameworkError(error, isPublicSharePath(request)),
  );
}
