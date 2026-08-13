import sharp from "sharp";

import { OG_IMAGE_CONTRACT } from "../config/constants.js";
import { AppError } from "../core/app-error.js";
import { SHARE_PAGE_V1_MANIFEST } from "./share-page-v1.manifest.js";

async function createBlock(
  width: number,
  height: number,
  background: { readonly r: number; readonly g: number; readonly b: number },
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toBuffer();
}

export async function renderOgImage(
  sanitizedCard: Buffer,
  timeoutSeconds: number,
): Promise<Buffer> {
  const manifest = SHARE_PAGE_V1_MANIFEST;
  try {
    const [containedCard, primaryAccent, secondaryAccent] = await Promise.all([
      sharp(sanitizedCard, { failOn: "warning" })
        .timeout({ seconds: timeoutSeconds })
        .resize({
          width: manifest.card.width,
          height: manifest.card.height,
          fit: "contain",
          withoutEnlargement: true,
          background: { ...manifest.background, alpha: 1 },
        })
        .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
        .toBuffer(),
      createBlock(520, 18, manifest.accent.primary),
      createBlock(420, 10, manifest.accent.secondary),
    ]);

    const { data, info } = await sharp({
      create: {
        width: manifest.canvas.width,
        height: manifest.canvas.height,
        channels: 3,
        background: manifest.background,
      },
    })
      .timeout({ seconds: timeoutSeconds })
      .composite([
        { input: containedCard, left: manifest.card.left, top: manifest.card.top },
        { input: primaryAccent, left: 610, top: 250 },
        { input: secondaryAccent, left: 610, top: 290 },
      ])
      .jpeg({ quality: 85, progressive: true, chromaSubsampling: "4:2:0" })
      .toBuffer({ resolveWithObject: true });

    if (
      info.width !== OG_IMAGE_CONTRACT.width ||
      info.height !== OG_IMAGE_CONTRACT.height ||
      data.length > OG_IMAGE_CONTRACT.maxStoredBytes
    ) {
      throw new AppError("INTERNAL_ERROR");
    }
    return data;
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
