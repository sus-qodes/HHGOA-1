import type { FastifyInstance } from "fastify";

export function installShutdownHandlers(
  app: FastifyInstance,
  graceMs: number,
): () => void {
  let closing = false;

  const close = (): void => {
    if (closing) {
      return;
    }
    closing = true;

    const timer = setTimeout(() => {
      process.exitCode = 1;
    }, graceMs);
    timer.unref();

    void app.close().finally(() => {
      clearTimeout(timer);
    });
  };

  process.once("SIGINT", close);
  process.once("SIGTERM", close);

  return () => {
    process.removeListener("SIGINT", close);
    process.removeListener("SIGTERM", close);
  };
}
