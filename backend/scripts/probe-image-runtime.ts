import assert from "node:assert/strict";

import sharp from "sharp";

import {
  OG_IMAGE_CONTRACT,
  SHARE_IMAGE_CONTRACT,
} from "../src/config/constants.js";
import { inspectPngStructure } from "../src/image/magic-bytes.js";
import { ShareImageProcessor } from "../src/image/share-image-processor.js";

async function runProbe(): Promise<void> {
  const sourceWithMetadata = await sharp({
    create: {
      width: SHARE_IMAGE_CONTRACT.width,
      height: SHARE_IMAGE_CONTRACT.height,
      channels: 4,
      background: { r: 18, g: 31, b: 55, alpha: 1 },
    },
  })
    .withExif({ IFD0: { Artist: "metadata-must-not-survive" } })
    .withMetadata({ density: 300 })
    .png()
    .toBuffer();

  const sourceMetadata = await sharp(sourceWithMetadata).metadata();
  assert.equal(sourceMetadata.format, "png");
  assert.equal(sourceMetadata.width, SHARE_IMAGE_CONTRACT.width);
  assert.equal(sourceMetadata.height, SHARE_IMAGE_CONTRACT.height);
  assert.ok(sourceMetadata.exif, "probe fixture should contain EXIF metadata");
  assert.equal(sourceMetadata.density, 300);

  const processed = await new ShareImageProcessor({
    maxInputBytes: SHARE_IMAGE_CONTRACT.maxInputBytes,
    maxStoredBytes: SHARE_IMAGE_CONTRACT.maxStoredBytes,
    timeoutMs: 10_000,
    maxConcurrency: 1,
    maxQueue: 0,
  }).process(sourceWithMetadata);
  const sanitized = processed.card;
  const ogImage = processed.og;

  const sanitizedMetadata = await sharp(sanitized).metadata();
  assert.equal(sanitizedMetadata.format, "png");
  assert.equal(sanitizedMetadata.width, SHARE_IMAGE_CONTRACT.width);
  assert.equal(sanitizedMetadata.height, SHARE_IMAGE_CONTRACT.height);
  assert.equal(sanitizedMetadata.exif, undefined);
  assert.equal(sanitizedMetadata.xmp, undefined);
  assert.equal(sanitizedMetadata.icc, undefined);
  assert.equal(sanitizedMetadata.hasAlpha, false);
  const publicPngChunks = inspectPngStructure(sanitized).chunkTypes;
  assert.ok(
    publicPngChunks.every((type) =>
      ["IHDR", "PLTE", "IDAT", "IEND"].includes(type),
    ),
  );

  const ogMetadata = await sharp(ogImage).metadata();
  assert.equal(ogMetadata.format, "jpeg");
  assert.equal(ogMetadata.width, OG_IMAGE_CONTRACT.width);
  assert.equal(ogMetadata.height, OG_IMAGE_CONTRACT.height);

  const heif = sharp.format.heif;
  const report = {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    sharpVersions: sharp.versions,
    capabilities: {
      pngInput: sharp.format.png.input.buffer,
      pngOutput: sharp.format.png.output.buffer,
      jpegOutput: sharp.format.jpeg.output.buffer,
      heifContainerInput: heif?.input.buffer ?? false,
      heifContainerOutput: heif?.output.buffer ?? false,
      hevcHeicDecode: "not-tested-no-real-hevc-fixture",
    },
    proofs: {
      sanitizedPngBytes: sanitized.length,
      metadataRemoved: true,
      publicPngChunks,
      quantized: processed.quantized,
      ogJpegBytes: ogImage.length,
      pngDimensions: [sanitizedMetadata.width, sanitizedMetadata.height],
      ogDimensions: [ogMetadata.width, ogMetadata.height],
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

await runProbe();
