import { performance } from "node:perf_hooks";

import sharp from "sharp";

import type { AppConfig } from "../config/env.js";
import { SHARE_IMAGE_CONTRACT } from "../config/constants.js";
import { AppError } from "../core/app-error.js";
import { WorkGate } from "../core/work-gate.js";
import {
  inspectPngStructure,
  hasPngSignature,
  retainPngChunks,
} from "./magic-bytes.js";
import { renderOgImage } from "./og-renderer.js";
import { initializeSharpRuntime } from "./sharp-runtime.js";

const PUBLIC_PNG_CHUNKS = new Set(["IHDR", "PLTE", "IDAT", "IEND"]);
const MINIMUM_QUANTIZED_PSNR = 32;

export interface ProcessedShareImages {
  readonly card: Buffer;
  readonly og: Buffer;
  readonly quantized: boolean;
  readonly quantizedPsnr: number | undefined;
}

export interface ShareImageProcessorOptions {
  readonly maxInputBytes: number;
  readonly maxStoredBytes: number;
  readonly timeoutMs: number;
  readonly maxConcurrency: number;
  readonly maxQueue: number;
}

class ProcessingDeadline {
  readonly #endsAt: number;

  constructor(timeoutMs: number) {
    this.#endsAt = performance.now() + timeoutMs;
  }

  secondsRemaining(): number {
    const remainingMs = this.#endsAt - performance.now();
    if (remainingMs <= 0) {
      throw new AppError("IMAGE_PROCESSING_TIMEOUT", { retryAfterSeconds: 2 });
    }
    return Math.max(1, Math.ceil(remainingMs / 1000));
  }

  assertNotExpired(): void {
    this.secondsRemaining();
  }
}

async function decodedRgbPixels(
  input: Buffer,
  deadline: ProcessingDeadline,
): Promise<Buffer> {
  return sharp(input)
    .timeout({ seconds: deadline.secondsRemaining() })
    .removeAlpha()
    .raw()
    .toBuffer();
}

async function calculatePsnr(
  original: Buffer,
  candidate: Buffer,
  deadline: ProcessingDeadline,
): Promise<number> {
  const [left, right] = await Promise.all([
    decodedRgbPixels(original, deadline),
    decodedRgbPixels(candidate, deadline),
  ]);
  if (left.length !== right.length || left.length === 0) {
    throw new AppError("INTERNAL_ERROR");
  }

  let squaredError = 0;
  for (let index = 0; index < left.length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    squaredError += difference * difference;
  }
  if (squaredError === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const meanSquaredError = squaredError / left.length;
  return 10 * Math.log10((255 * 255) / meanSquaredError);
}

async function encodeSanitizedCard(
  input: Buffer,
  maxStoredBytes: number,
  deadline: ProcessingDeadline,
): Promise<{
  readonly card: Buffer;
  readonly quantized: boolean;
  readonly quantizedPsnr: number | undefined;
}> {
  const { data: pixels, info: decodedInfo } = await sharp(input, {
    failOn: "warning",
    limitInputPixels: SHARE_IMAGE_CONTRACT.maxInputPixels,
    pages: 1,
  })
    .timeout({ seconds: deadline.secondsRemaining() })
    .autoOrient()
    .toColourspace("srgb")
    .flatten({ background: { r: 6, g: 63, b: 46 } })
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (
    decodedInfo.width !== SHARE_IMAGE_CONTRACT.width ||
    decodedInfo.height !== SHARE_IMAGE_CONTRACT.height ||
    decodedInfo.channels !== 3
  ) {
    throw new AppError("INVALID_IMAGE_DIMENSIONS");
  }

  const { data: encodedFullColour, info: encodedInfo } = await sharp(pixels, {
    raw: {
      width: decodedInfo.width,
      height: decodedInfo.height,
      channels: decodedInfo.channels,
    },
  })
    .timeout({ seconds: deadline.secondsRemaining() })
    .png({
      compressionLevel: 6,
      adaptiveFiltering: false,
      palette: false,
    })
    .toBuffer({ resolveWithObject: true });
  const fullColour = retainPngChunks(encodedFullColour, PUBLIC_PNG_CHUNKS);

  if (
    encodedInfo.width !== SHARE_IMAGE_CONTRACT.width ||
    encodedInfo.height !== SHARE_IMAGE_CONTRACT.height
  ) {
    throw new AppError("INTERNAL_ERROR");
  }
  if (fullColour.length <= maxStoredBytes) {
    return { card: fullColour, quantized: false, quantizedPsnr: undefined };
  }

  const encodedPaletteCandidate = await sharp(fullColour)
    .timeout({ seconds: deadline.secondsRemaining() })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true,
      colours: 256,
      quality: 90,
      dither: 1,
      effort: 3,
    })
    .toBuffer();
  const paletteCandidate = retainPngChunks(
    encodedPaletteCandidate,
    PUBLIC_PNG_CHUNKS,
  );
  const psnr = await calculatePsnr(fullColour, paletteCandidate, deadline);
  if (paletteCandidate.length > maxStoredBytes || psnr < MINIMUM_QUANTIZED_PSNR) {
    throw new AppError("HOSTED_IMAGE_TOO_LARGE");
  }
  return { card: paletteCandidate, quantized: true, quantizedPsnr: psnr };
}

export class ShareImageProcessor {
  readonly #options: ShareImageProcessorOptions;
  readonly #gate: WorkGate;

  constructor(options: ShareImageProcessorOptions) {
    this.#options = options;
    this.#gate = new WorkGate(options.maxConcurrency, options.maxQueue);
    initializeSharpRuntime(options.maxConcurrency);
  }

  static fromConfig(config: AppConfig): ShareImageProcessor {
    return new ShareImageProcessor({
      maxInputBytes: config.shareUploadMaxBytes,
      maxStoredBytes: config.shareStoredMaxBytes,
      timeoutMs: config.shareProcessTimeoutMs,
      maxConcurrency: config.imageMaxConcurrency,
      maxQueue: config.imageQueueLimit,
    });
  }

  process(input: Buffer): Promise<ProcessedShareImages> {
    const deadline = new ProcessingDeadline(this.#options.timeoutMs);
    return this.#gate.run(async () => this.#processWithinGate(input, deadline));
  }

  workSnapshot() {
    return this.#gate.snapshot();
  }

  async #processWithinGate(
    input: Buffer,
    deadline: ProcessingDeadline,
  ): Promise<ProcessedShareImages> {
    deadline.assertNotExpired();
    if (input.length === 0) {
      throw new AppError("EMPTY_BODY");
    }
    if (input.length > this.#options.maxInputBytes) {
      throw new AppError("PAYLOAD_TOO_LARGE");
    }
    if (!hasPngSignature(input)) {
      throw new AppError("IMAGE_TYPE_MISMATCH");
    }

    let inspection;
    try {
      inspection = inspectPngStructure(input);
    } catch (error) {
      throw new AppError("INVALID_IMAGE", { cause: error });
    }
    if (inspection.animated) {
      throw new AppError("ANIMATED_IMAGE_NOT_SUPPORTED");
    }

    try {
      const metadata = await sharp(input, {
        failOn: "warning",
        limitInputPixels: SHARE_IMAGE_CONTRACT.maxInputPixels,
        pages: 1,
      })
        .timeout({ seconds: deadline.secondsRemaining() })
        .metadata();

      if (metadata.format !== "png") {
        throw new AppError("IMAGE_TYPE_MISMATCH");
      }
      if ((metadata.pages ?? 1) !== 1) {
        throw new AppError("ANIMATED_IMAGE_NOT_SUPPORTED");
      }
      if (
        metadata.autoOrient.width !== SHARE_IMAGE_CONTRACT.width ||
        metadata.autoOrient.height !== SHARE_IMAGE_CONTRACT.height
      ) {
        throw new AppError("INVALID_IMAGE_DIMENSIONS");
      }

      const encoded = await encodeSanitizedCard(
        input,
        this.#options.maxStoredBytes,
        deadline,
      );
      const outputInspection = inspectPngStructure(encoded.card);
      if (outputInspection.chunkTypes.some((type) => !PUBLIC_PNG_CHUNKS.has(type))) {
        throw new AppError("INTERNAL_ERROR");
      }

      const og = await renderOgImage(
        encoded.card,
        deadline.secondsRemaining(),
      );
      deadline.assertNotExpired();
      return { ...encoded, og };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.message.toLowerCase().includes("timeout")) {
        throw new AppError("IMAGE_PROCESSING_TIMEOUT", {
          cause: error,
          retryAfterSeconds: 2,
        });
      }
      throw new AppError("INVALID_IMAGE", { cause: error });
    }
  }
}
