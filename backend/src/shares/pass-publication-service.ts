import { createHash } from "node:crypto";

import type { AppConfig } from "../config/env.js";
import {
  BLOB_PATHS,
  SHARE_IMAGE_CONTRACT,
  TEMPLATE_CONTRACT,
} from "../config/constants.js";
import { AppError } from "../core/app-error.js";
import type { ProcessedShareImages } from "../image/share-image-processor.js";
import {
  type PublicPass,
  type PublishedPassManifest,
  parsePublishedPassManifest,
} from "./pass.contract.js";
import type { PassBlobStoragePort } from "../storage/vercel-blob-pass-storage.js";
import {
  BlobPassStorageError,
} from "../storage/vercel-blob-pass-storage.js";
import { isShareId } from "./share-id.js";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ShareImageProcessorPort {
  process(input: Buffer): Promise<ProcessedShareImages>;
}

export interface FinalizedPass {
  readonly pass: PublicPass;
  readonly created: boolean;
}

function sha256(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("base64url");
}

function passUrl(baseUrl: string, id: string): string {
  return new URL(`/pass/${encodeURIComponent(id)}`, `${baseUrl}/`).href;
}

function toPublicPass(
  manifest: PublishedPassManifest,
  config: AppConfig,
): PublicPass {
  return {
    id: manifest.id,
    url: passUrl(config.publicShareBaseUrl, manifest.id),
    cardUrl: manifest.objects.card.url,
    ogImageUrl: manifest.objects.og.url,
    template: TEMPLATE_CONTRACT,
    retentionDays: config.retentionDays,
    scheduledDeletionAfter: manifest.scheduledDeletionAfter,
  };
}

export class PassPublicationService {
  readonly #config: AppConfig;
  readonly #storage: PassBlobStoragePort;
  readonly #imageProcessor: ShareImageProcessorPort;

  constructor(options: {
    readonly config: AppConfig;
    readonly storage: PassBlobStoragePort;
    readonly imageProcessor: ShareImageProcessorPort;
  }) {
    this.#config = options.config;
    this.#storage = options.storage;
    this.#imageProcessor = options.imageProcessor;
  }

  async find(id: string): Promise<PublicPass | null> {
    if (!isShareId(id)) {
      return null;
    }
    try {
      const manifest = await this.#readManifest(id);
      return manifest === null ? null : toPublicPass(manifest, this.#config);
    } catch {
      throw new AppError("SHARE_STORAGE_UNAVAILABLE");
    }
  }

  async finalize(id: string): Promise<FinalizedPass> {
    if (!isShareId(id)) {
      throw new AppError("INVALID_REQUEST");
    }

    try {
      const existing = await this.#readManifest(id);
      if (existing !== null) {
        await this.#deleteStagingBestEffort(id);
        return { pass: toPublicPass(existing, this.#config), created: false };
      }

      let staged;
      try {
        staged = await this.#storage.readStaging(id);
      } catch (error) {
        if (
          error instanceof BlobPassStorageError &&
          error.code === "OBJECT_TOO_LARGE"
        ) {
          await this.#deleteStagingBestEffort(id);
          throw new AppError("PAYLOAD_TOO_LARGE", { cause: error });
        }
        throw error;
      }
      if (staged === null) {
        throw new AppError("UPLOAD_NOT_READY", { retryAfterSeconds: 2 });
      }
      if (
        staged.pathname !== BLOB_PATHS.staging(id) ||
        staged.contentType !== SHARE_IMAGE_CONTRACT.mimeType ||
        staged.size !== staged.body.byteLength
      ) {
        await this.#deleteStagingBestEffort(id);
        throw new AppError("IMAGE_TYPE_MISMATCH");
      }

      let processed;
      try {
        processed = await this.#imageProcessor.process(staged.body);
      } catch (error) {
        if (error instanceof AppError && !error.retryable) {
          await this.#deleteStagingBestEffort(id);
        }
        throw error;
      }

      const [card, og] = await Promise.all([
        this.#storage.publishCard(id, processed.card),
        this.#storage.publishOg(id, processed.og),
      ]);
      const createdAt = staged.uploadedAt;
      const scheduledDeletionAfter = new Date(
        createdAt.getTime() + this.#config.retentionDays * MILLISECONDS_PER_DAY,
      );
      const manifest: PublishedPassManifest = {
        schemaVersion: 2,
        id,
        template: TEMPLATE_CONTRACT,
        createdAt: createdAt.toISOString(),
        scheduledDeletionAfter: scheduledDeletionAfter.toISOString(),
        objects: {
          card: {
            url: card.url,
            pathname: card.pathname,
            bytes: processed.card.byteLength,
            sha256: sha256(processed.card),
          },
          og: {
            url: og.url,
            pathname: og.pathname,
            bytes: processed.og.byteLength,
            sha256: sha256(processed.og),
          },
        },
      };
      const manifestBody = Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8");
      await this.#storage.publishManifest(id, manifestBody);
      await this.#deleteStagingBestEffort(id);
      return { pass: toPublicPass(manifest, this.#config), created: true };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("SHARE_STORAGE_UNAVAILABLE", { cause: error });
    }
  }

  async #readManifest(id: string): Promise<PublishedPassManifest | null> {
    const stored = await this.#storage.readManifest(id);
    if (stored === null) {
      return null;
    }
    if (
      stored.pathname !== BLOB_PATHS.manifest(id) ||
      stored.contentType !== "application/json" ||
      stored.size !== stored.body.byteLength
    ) {
      throw new BlobPassStorageError("INVALID_OBJECT");
    }
    const parsed = parsePublishedPassManifest(stored.body, id, {
      card: BLOB_PATHS.card(id),
      og: BLOB_PATHS.og(id),
    });
    if (parsed === null) {
      throw new BlobPassStorageError("INVALID_OBJECT");
    }
    return parsed;
  }

  async #deleteStagingBestEffort(id: string): Promise<void> {
    try {
      await this.#storage.deleteStaging(id);
    } catch {
      // The scheduled retention route removes abandoned staging objects later.
    }
  }
}
