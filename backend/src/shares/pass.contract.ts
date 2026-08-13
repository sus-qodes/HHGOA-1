import {
  SHARE_IMAGE_CONTRACT,
  TEMPLATE_CONTRACT,
} from "../config/constants.js";
import { isShareId } from "./share-id.js";

export const PASS_MANIFEST_MAX_BYTES = 16 * 1024;

export interface PublishedPassObject {
  readonly url: string;
  readonly pathname: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface PublishedPassManifest {
  readonly schemaVersion: 2;
  readonly id: string;
  readonly template: typeof TEMPLATE_CONTRACT;
  readonly createdAt: string;
  readonly scheduledDeletionAfter: string;
  readonly objects: {
    readonly card: PublishedPassObject;
    readonly og: PublishedPassObject;
  };
}

export interface PublicPass {
  readonly id: string;
  readonly url: string;
  readonly cardUrl: string;
  readonly ogImageUrl: string;
  readonly template: typeof TEMPLATE_CONTRACT;
  readonly retentionDays: number;
  readonly scheduledDeletionAfter: string;
}

export interface PassUploadInstructions {
  readonly id: string;
  readonly pathname: string;
  readonly tokenUrl: string;
  readonly finalizeUrl: string;
  readonly access: "public";
  readonly contentType: typeof SHARE_IMAGE_CONTRACT.mimeType;
  readonly maximumSizeInBytes: number;
  readonly multipart: true;
  readonly template: typeof TEMPLATE_CONTRACT;
}

export const PUBLIC_PASS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "url",
    "cardUrl",
    "ogImageUrl",
    "template",
    "retentionDays",
    "scheduledDeletionAfter",
  ],
  properties: {
    id: { type: "string", pattern: "^[A-Za-z0-9_-]{32}$" },
    url: { type: "string", format: "uri" },
    cardUrl: { type: "string", format: "uri" },
    ogImageUrl: { type: "string", format: "uri" },
    template: {
      type: "object",
      additionalProperties: false,
      required: ["id", "version"],
      properties: {
        id: { const: TEMPLATE_CONTRACT.id },
        version: { const: TEMPLATE_CONTRACT.version },
      },
    },
    retentionDays: { type: "integer", minimum: 1 },
    scheduledDeletionAfter: { type: "string", format: "date-time" },
  },
} as const;

export const PASS_UPLOAD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "pathname",
    "tokenUrl",
    "finalizeUrl",
    "access",
    "contentType",
    "maximumSizeInBytes",
    "multipart",
    "template",
  ],
  properties: {
    id: { type: "string", pattern: "^[A-Za-z0-9_-]{32}$" },
    pathname: { type: "string", minLength: 1 },
    tokenUrl: { type: "string", format: "uri" },
    finalizeUrl: { type: "string", format: "uri" },
    access: { const: "public" },
    contentType: { const: SHARE_IMAGE_CONTRACT.mimeType },
    maximumSizeInBytes: { const: SHARE_IMAGE_CONTRACT.maxInputBytes },
    multipart: { const: true },
    template: {
      type: "object",
      additionalProperties: false,
      required: ["id", "version"],
      properties: {
        id: { const: TEMPLATE_CONTRACT.id },
        version: { const: TEMPLATE_CONTRACT.version },
      },
    },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isAbsoluteHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

function isManifestObject(
  value: unknown,
  expectedPathname: string,
): value is PublishedPassObject {
  if (!isRecord(value)) {
    return false;
  }
  const { url, pathname, bytes, sha256 } = value;
  if (
    pathname !== expectedPathname ||
    !isAbsoluteHttpUrl(url) ||
    !Number.isSafeInteger(bytes) ||
    (bytes as number) <= 0 ||
    typeof sha256 !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/u.test(sha256)
  ) {
    return false;
  }
  return new URL(url).pathname.endsWith(`/${expectedPathname}`);
}

export function parsePublishedPassManifest(
  input: Buffer,
  expectedId: string,
  paths: { readonly card: string; readonly og: string },
): PublishedPassManifest | null {
  if (input.byteLength === 0 || input.byteLength > PASS_MANIFEST_MAX_BYTES) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(input.toString("utf8"));
  } catch {
    return null;
  }
  if (!isRecord(value) || !isRecord(value.template) || !isRecord(value.objects)) {
    return null;
  }
  if (
    value.schemaVersion !== 2 ||
    value.id !== expectedId ||
    !isShareId(value.id) ||
    value.template.id !== TEMPLATE_CONTRACT.id ||
    value.template.version !== TEMPLATE_CONTRACT.version ||
    !isIsoDate(value.createdAt) ||
    !isIsoDate(value.scheduledDeletionAfter) ||
    !isManifestObject(value.objects.card, paths.card) ||
    !isManifestObject(value.objects.og, paths.og)
  ) {
    return null;
  }
  return value as unknown as PublishedPassManifest;
}
