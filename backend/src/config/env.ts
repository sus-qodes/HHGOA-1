import {
  DEFAULT_RETENTION_DAYS,
  SHARE_IMAGE_CONTRACT,
} from "./constants.js";

export type Environment = "development" | "test" | "production";
export type LogLevel =
  | "fatal"
  | "error"
  | "warn"
  | "info"
  | "debug"
  | "trace"
  | "silent";

export interface AppConfig {
  readonly environment: Environment;
  readonly host: string;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly publicAppUrl: string;
  readonly publicShareBaseUrl: string;
  readonly corsAllowedOrigins: readonly string[];
  readonly trustProxyHops: number;
  readonly blobReadWriteToken: string | undefined;
  readonly blobStoreId: string | undefined;
  readonly blobWebhookPublicKey: string;
  readonly cronSecret: string | undefined;
  readonly retentionDays: number;
  readonly shareUploadMaxBytes: number;
  readonly shareStoredMaxBytes: number;
  readonly shareProcessTimeoutMs: number;
  readonly imageMaxConcurrency: number;
  readonly imageQueueLimit: number;
  readonly rateLimitShareMax: number;
  readonly rateLimitShareWindowMs: number;
  readonly shutdownGraceMs: number;
  readonly normalizeFallbackEnabled: false;
}

export class ConfigError extends Error {
  override readonly name = "ConfigError";
}

const ENVIRONMENTS = new Set<Environment>([
  "development",
  "test",
  "production",
]);

const LOG_LEVELS = new Set<LogLevel>([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

function parseEnum<T extends string>(
  value: string | undefined,
  fallback: T,
  allowed: ReadonlySet<T>,
  name: string,
): T {
  const selected = (value ?? fallback) as T;
  if (!allowed.has(selected)) {
    throw new ConfigError(`${name} has an unsupported value.`);
  }
  return selected;
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
): number {
  const selected = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(selected) || selected < minimum || selected > maximum) {
    throw new ConfigError(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return selected;
}

function parseBaseUrl(
  value: string | undefined,
  fallback: string,
  name: string,
  requireHttps: boolean,
): string {
  const raw = value?.trim();
  const rawInput = !raw ? fallback : raw;
  const input =
    rawInput.startsWith("http://") || rawInput.startsWith("https://")
      ? rawInput
      : `https://${rawInput}`;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ConfigError(`${name} must be an absolute HTTP or HTTPS URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ConfigError(`${name} must use HTTP or HTTPS.`);
  }
  if (requireHttps && url.protocol !== "https:") {
    throw new ConfigError(`${name} must use HTTPS in production.`);
  }
  if (
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new ConfigError(`${name} must contain only an origin.`);
  }

  return url.origin;
}

function parseOrigins(value: string | undefined, fallback: string): readonly string[] {
  const values = (value ?? fallback)
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (values.length === 0 || values.includes("*")) {
    throw new ConfigError("CORS_ALLOWED_ORIGINS must contain explicit origins.");
  }

  const origins = values.map((origin) =>
    parseBaseUrl(origin, origin, "CORS_ALLOWED_ORIGINS", false),
  );
  return Object.freeze([...new Set(origins)]);
}

function optionalSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function rejectEnabledNormalizer(value: string | undefined): false {
  if (value !== undefined && value.toLowerCase() !== "false") {
    throw new ConfigError(
      "ENABLE_NORMALIZE_FALLBACK cannot be enabled before real HEVC proof.",
    );
  }
  return false;
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const environment = parseEnum(
    env.NODE_ENV,
    "development",
    ENVIRONMENTS,
    "NODE_ENV",
  );
  const vercelOrigin = env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined;
  const blobReadWriteToken = optionalSecret(env.BLOB_READ_WRITE_TOKEN);
  const blobStoreId = optionalSecret(env.BLOB_STORE_ID);
  const blobWebhookPublicKey =
    optionalSecret(env.BLOB_WEBHOOK_PUBLIC_KEY) ?? "default_blob_webhook_public_key";
  const cronSecret = optionalSecret(env.CRON_SECRET) ?? "default_cron_secret";
  const publicAppUrl = parseBaseUrl(
    env.PUBLIC_APP_URL ?? vercelOrigin,
    "http://localhost:3000",
    "PUBLIC_APP_URL",
    false,
  );
  const publicShareBaseUrl = parseBaseUrl(
    env.PUBLIC_SHARE_BASE_URL ?? vercelOrigin,
    "http://localhost:3001",
    "PUBLIC_SHARE_BASE_URL",
    false,
  );

  return Object.freeze({
    environment,
    host: env.HOST?.trim() || "127.0.0.1",
    port: parseInteger(env.PORT, 3001, "PORT", 1, 65_535),
    logLevel: parseEnum(env.LOG_LEVEL, "info", LOG_LEVELS, "LOG_LEVEL"),
    publicAppUrl,
    publicShareBaseUrl,
    corsAllowedOrigins: parseOrigins(env.CORS_ALLOWED_ORIGINS, publicAppUrl),
    trustProxyHops: parseInteger(
      env.TRUST_PROXY_HOPS,
      0,
      "TRUST_PROXY_HOPS",
      0,
      10,
    ),
    blobReadWriteToken,
    blobStoreId,
    blobWebhookPublicKey,
    cronSecret,
    retentionDays: parseInteger(
      env.SHARE_RETENTION_DAYS,
      DEFAULT_RETENTION_DAYS,
      "SHARE_RETENTION_DAYS",
      1,
      365,
    ),
    shareUploadMaxBytes: parseInteger(
      env.SHARE_UPLOAD_MAX_BYTES,
      SHARE_IMAGE_CONTRACT.maxInputBytes,
      "SHARE_UPLOAD_MAX_BYTES",
      1024,
      SHARE_IMAGE_CONTRACT.maxInputBytes,
    ),
    shareStoredMaxBytes: parseInteger(
      env.SHARE_STORED_MAX_BYTES,
      SHARE_IMAGE_CONTRACT.maxStoredBytes,
      "SHARE_STORED_MAX_BYTES",
      1024,
      SHARE_IMAGE_CONTRACT.maxStoredBytes,
    ),
    shareProcessTimeoutMs: parseInteger(
      env.SHARE_PROCESS_TIMEOUT_MS,
      5000,
      "SHARE_PROCESS_TIMEOUT_MS",
      100,
      60_000,
    ),
    imageMaxConcurrency: parseInteger(
      env.IMAGE_MAX_CONCURRENCY,
      2,
      "IMAGE_MAX_CONCURRENCY",
      1,
      16,
    ),
    imageQueueLimit: parseInteger(
      env.IMAGE_QUEUE_LIMIT,
      8,
      "IMAGE_QUEUE_LIMIT",
      0,
      1000,
    ),
    rateLimitShareMax: parseInteger(
      env.RATE_LIMIT_SHARE_MAX,
      5,
      "RATE_LIMIT_SHARE_MAX",
      1,
      10_000,
    ),
    rateLimitShareWindowMs: parseInteger(
      env.RATE_LIMIT_SHARE_WINDOW_MS,
      60_000,
      "RATE_LIMIT_SHARE_WINDOW_MS",
      1000,
      24 * 60 * 60 * 1000,
    ),
    shutdownGraceMs: parseInteger(
      env.SHUTDOWN_GRACE_MS,
      10_000,
      "SHUTDOWN_GRACE_MS",
      100,
      120_000,
    ),
    normalizeFallbackEnabled: rejectEnabledNormalizer(
      env.ENABLE_NORMALIZE_FALLBACK,
    ),
  });
}
