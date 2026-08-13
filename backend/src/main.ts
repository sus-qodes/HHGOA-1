import { buildApp } from "./app.js";
import { ConfigError, loadConfig } from "./config/env.js";
import { installShutdownHandlers } from "./core/shutdown.js";

async function start(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp({ config });
  installShutdownHandlers(app, config.shutdownGraceMs);
  await app.listen({ host: config.host, port: config.port });
}

try {
  await start();
} catch (error) {
  const detail =
    error instanceof ConfigError
      ? ` ${error.message}`
      : " Check configuration and logs.";
  process.stderr.write(`HH Goa backend failed to start.${detail}\n`);
  process.exitCode = 1;
}
