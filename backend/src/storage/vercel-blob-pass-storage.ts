import {
  del as deleteBlob,
  get as getBlob,
  list as listBlobs,
  put as putBlob,
  BlobNotFoundError,
  type ListBlobResultBlob,
  type PutBlobResult,
} from "@vercel/blob";

import {
  BLOB_PATHS,
  SHARE_IMAGE_CONTRACT,
} from "../config/constants.js";
import { isShareId } from "../shares/share-id.js";

const PUBLIC_CACHE_SECONDS = 24 * 60 * 60;
const LIST_PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 100;

export interface PassBlobObject {
  readonly pathname: string;
  readonly url: string;
  readonly contentType: string;
  readonly body: Buffer;
  readonly size: number;
  readonly uploadedAt: Date;
  readonly etag: string;
}

export interface PublishedBlobObject {
  readonly pathname: string;
  readonly url: string;
  readonly contentType: string;
  readonly size: number;
  readonly etag: string;
}

export interface BlobRetentionResult {
  readonly inspected: number;
  readonly expiredPasses: number;
  readonly staleUploads: number;
  readonly partialPasses: number;
  readonly deletedObjects: number;
}

export interface PassBlobStoragePort {
  checkReady(): Promise<void>;
  readStaging(shareId: string): Promise<PassBlobObject | null>;
  readManifest(shareId: string): Promise<PassBlobObject | null>;
  publishCard(shareId: string, body: Buffer): Promise<PublishedBlobObject>;
  publishOg(shareId: string, body: Buffer): Promise<PublishedBlobObject>;
  publishManifest(
    shareId: string,
    body: Buffer,
  ): Promise<PublishedBlobObject>;
  deleteStaging(shareId: string): Promise<void>;
  removeExpired(
    publishedBefore: Date,
    stagingBefore: Date,
    maximumPasses?: number,
  ): Promise<BlobRetentionResult>;
}

export type BlobPassStorageErrorCode =
  | "INVALID_OBJECT"
  | "OBJECT_TOO_LARGE"
  | "STORAGE_UNAVAILABLE";

export class BlobPassStorageError extends Error {
  override readonly name = "BlobPassStorageError";
  readonly code: BlobPassStorageErrorCode;

  constructor(code: BlobPassStorageErrorCode, options?: ErrorOptions) {
    super("Vercel Blob pass storage is unavailable.", options);
    this.code = code;
  }
}

export interface VercelBlobSdkPort {
  get: typeof getBlob;
  put: typeof putBlob;
  del: typeof deleteBlob;
  list: typeof listBlobs;
}

const DEFAULT_SDK: VercelBlobSdkPort = Object.freeze({
  get: getBlob,
  put: putBlob,
  del: deleteBlob,
  list: listBlobs,
});

function assertShareId(shareId: string): void {
  if (!isShareId(shareId)) {
    throw new BlobPassStorageError("INVALID_OBJECT");
  }
}

function assertPublicBlobResult(
  result: PutBlobResult,
  pathname: string,
  contentType: string,
): PublishedBlobObject {
  let url: URL;
  try {
    url = new URL(result.url);
  } catch (error) {
    throw new BlobPassStorageError("STORAGE_UNAVAILABLE", { cause: error });
  }
  if (
    result.pathname !== pathname ||
    result.contentType !== contentType ||
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".public.blob.vercel-storage.com") ||
    !url.pathname.endsWith(`/${pathname}`)
  ) {
    throw new BlobPassStorageError("STORAGE_UNAVAILABLE");
  }
  return {
    pathname: result.pathname,
    url: result.url,
    contentType: result.contentType,
    size: 0,
    etag: result.etag,
  };
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
  maximumBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.byteLength;
    if (total > maximumBytes) {
      await stream.cancel().catch(() => undefined);
      throw new BlobPassStorageError("OBJECT_TOO_LARGE");
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, total);
}

function splitBatches<T>(values: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size));
  }
  return batches;
}

interface PassGroup {
  readonly id: string;
  readonly pathnames: Set<string>;
  newest: Date;
  manifestUploadedAt: Date | undefined;
}

interface BlobCredentials {
  readonly token?: string;
  readonly storeId?: string;
}

function blobCredentials(
  token: string | undefined,
  storeId: string | undefined,
): BlobCredentials {
  const selectedToken = token?.trim();
  if (selectedToken !== undefined && selectedToken.length > 0) {
    return Object.freeze({ token: selectedToken });
  }

  const selectedStoreId = storeId?.trim();
  if (selectedStoreId !== undefined && selectedStoreId.length > 0) {
    return Object.freeze({ storeId: selectedStoreId });
  }

  throw new BlobPassStorageError("STORAGE_UNAVAILABLE");
}

export class VercelBlobPassStorage implements PassBlobStoragePort {
  readonly #credentials: BlobCredentials;
  readonly #sdk: VercelBlobSdkPort;

  constructor(options: {
    readonly token?: string | undefined;
    readonly storeId?: string | undefined;
    readonly sdk?: VercelBlobSdkPort;
  }) {
    this.#credentials = blobCredentials(options.token, options.storeId);
    this.#sdk = options.sdk ?? DEFAULT_SDK;
  }

  async checkReady(): Promise<void> {
    try {
      await this.#sdk.list({
        ...this.#credentials,
        prefix: "passes/",
        limit: 1,
      });
    } catch (error) {
      throw new BlobPassStorageError("STORAGE_UNAVAILABLE", { cause: error });
    }
  }

  async readStaging(shareId: string): Promise<PassBlobObject | null> {
    assertShareId(shareId);
    return this.#read(
      BLOB_PATHS.staging(shareId),
      SHARE_IMAGE_CONTRACT.maxInputBytes,
    );
  }

  async readManifest(shareId: string): Promise<PassBlobObject | null> {
    assertShareId(shareId);
    return this.#read(BLOB_PATHS.manifest(shareId), 16 * 1024);
  }

  async publishCard(
    shareId: string,
    body: Buffer,
  ): Promise<PublishedBlobObject> {
    assertShareId(shareId);
    return this.#publish(
      BLOB_PATHS.card(shareId),
      body,
      SHARE_IMAGE_CONTRACT.mimeType,
    );
  }

  async publishOg(
    shareId: string,
    body: Buffer,
  ): Promise<PublishedBlobObject> {
    assertShareId(shareId);
    return this.#publish(BLOB_PATHS.og(shareId), body, "image/jpeg");
  }

  async publishManifest(
    shareId: string,
    body: Buffer,
  ): Promise<PublishedBlobObject> {
    assertShareId(shareId);
    return this.#publish(
      BLOB_PATHS.manifest(shareId),
      body,
      "application/json",
    );
  }

  async deleteStaging(shareId: string): Promise<void> {
    assertShareId(shareId);
    try {
      await this.#sdk.del(BLOB_PATHS.staging(shareId), {
        ...this.#credentials,
      });
    } catch (error) {
      throw new BlobPassStorageError("STORAGE_UNAVAILABLE", { cause: error });
    }
  }

  async removeExpired(
    publishedBefore: Date,
    stagingBefore: Date,
    maximumPasses = 1000,
  ): Promise<BlobRetentionResult> {
    if (
      !Number.isFinite(publishedBefore.getTime()) ||
      !Number.isFinite(stagingBefore.getTime()) ||
      !Number.isSafeInteger(maximumPasses) ||
      maximumPasses < 1
    ) {
      throw new BlobPassStorageError("INVALID_OBJECT");
    }

    try {
      const staleStaging: string[] = [];
      let inspected = 0;
      for await (const blob of this.#scan("staging/")) {
        inspected += 1;
        if (
          staleStaging.length < maximumPasses &&
          blob.uploadedAt < stagingBefore &&
          /^staging\/[A-Za-z0-9_-]{32}\/source\.png$/u.test(blob.pathname)
        ) {
          staleStaging.push(blob.pathname);
        }
      }

      const groups = new Map<string, PassGroup>();
      for await (const blob of this.#scan("passes/")) {
        inspected += 1;
        const match =
          /^passes\/([A-Za-z0-9_-]{32})\/(card\.png|og\.jpg|manifest\.json)$/u.exec(
            blob.pathname,
          );
        const id = match?.[1];
        if (id === undefined || !isShareId(id)) {
          continue;
        }
        let group = groups.get(id);
        if (group === undefined) {
          group = {
            id,
            pathnames: new Set(),
            newest: blob.uploadedAt,
            manifestUploadedAt: undefined,
          };
          groups.set(id, group);
        }
        group.pathnames.add(blob.pathname);
        if (blob.uploadedAt > group.newest) {
          group.newest = blob.uploadedAt;
        }
        if (match?.[2] === "manifest.json") {
          group.manifestUploadedAt = blob.uploadedAt;
        }
      }

      const expiredGroups = [...groups.values()]
        .filter(
          (group) =>
            (group.manifestUploadedAt !== undefined &&
              group.manifestUploadedAt < publishedBefore) ||
            (group.manifestUploadedAt === undefined &&
              group.newest < stagingBefore),
        )
        .sort((left, right) => left.newest.getTime() - right.newest.getTime())
        .slice(0, maximumPasses);
      const passPaths = expiredGroups.flatMap((group) => [
        BLOB_PATHS.card(group.id),
        BLOB_PATHS.og(group.id),
        BLOB_PATHS.manifest(group.id),
      ]);
      const allPaths = [...staleStaging, ...passPaths];
      for (const batch of splitBatches(allPaths, DELETE_BATCH_SIZE)) {
        await this.#sdk.del(batch, { ...this.#credentials });
      }

      return {
        inspected,
        expiredPasses: expiredGroups.filter(
          (group) => group.manifestUploadedAt !== undefined,
        ).length,
        staleUploads: staleStaging.length,
        partialPasses: expiredGroups.filter(
          (group) => group.manifestUploadedAt === undefined,
        ).length,
        deletedObjects: allPaths.length,
      };
    } catch (error) {
      if (error instanceof BlobPassStorageError) {
        throw error;
      }
      throw new BlobPassStorageError("STORAGE_UNAVAILABLE", { cause: error });
    }
  }

  async #read(
    pathname: string,
    maximumBytes: number,
  ): Promise<PassBlobObject | null> {
    try {
      const result = await this.#sdk.get(pathname, {
        access: "public",
        ...this.#credentials,
      });
      if (result === null || result.statusCode !== 200 || result.stream === null) {
        return null;
      }
      if (
        result.blob.pathname !== pathname ||
        result.blob.size === null ||
        result.blob.size > maximumBytes ||
        result.blob.size < 1 ||
        result.blob.contentType === null
      ) {
        if (result.blob.size !== null && result.blob.size > maximumBytes) {
          await result.stream.cancel().catch(() => undefined);
          throw new BlobPassStorageError("OBJECT_TOO_LARGE");
        }
        await result.stream.cancel().catch(() => undefined);
        throw new BlobPassStorageError("INVALID_OBJECT");
      }
      const body = await streamToBuffer(result.stream, maximumBytes);
      if (body.byteLength !== result.blob.size) {
        throw new BlobPassStorageError("INVALID_OBJECT");
      }
      return {
        pathname: result.blob.pathname,
        url: result.blob.url,
        contentType: result.blob.contentType,
        body,
        size: result.blob.size,
        uploadedAt: result.blob.uploadedAt,
        etag: result.blob.etag,
      };
    } catch (error) {
      if (error instanceof BlobPassStorageError) {
        throw error;
      }
      if (
        error instanceof BlobNotFoundError ||
        (typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "BlobNotFoundError")
      ) {
        return null;
      }
      throw new BlobPassStorageError("STORAGE_UNAVAILABLE", { cause: error });
    }
  }

  async #publish(
    pathname: string,
    body: Buffer,
    contentType: string,
  ): Promise<PublishedBlobObject> {
    if (body.byteLength === 0) {
      throw new BlobPassStorageError("INVALID_OBJECT");
    }
    try {
      const result = await this.#sdk.put(pathname, body, {
        access: "public",
        ...this.#credentials,
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: PUBLIC_CACHE_SECONDS,
      });
      return {
        ...assertPublicBlobResult(result, pathname, contentType),
        size: body.byteLength,
      };
    } catch (error) {
      if (error instanceof BlobPassStorageError) {
        throw error;
      }
      throw new BlobPassStorageError("STORAGE_UNAVAILABLE", { cause: error });
    }
  }

  async *#scan(prefix: string): AsyncGenerator<ListBlobResultBlob> {
    let cursor: string | undefined;
    do {
      const page = await this.#sdk.list({
        ...this.#credentials,
        prefix,
        limit: LIST_PAGE_SIZE,
        ...(cursor === undefined ? {} : { cursor }),
      });
      for (const blob of page.blobs) {
        yield blob;
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor !== undefined);
  }
}
