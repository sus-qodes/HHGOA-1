import sharp from "sharp";

import { OG_IMAGE_CONTRACT } from "../config/constants.js";
import { AppError } from "../core/app-error.js";
import { SHARE_PAGE_V1_MANIFEST } from "./share-page-v1.manifest.js";

function buildOgOverlaySvg(
  cardLeft: number,
  cardTop: number,
  cardWidth: number,
  cardHeight: number,
): Buffer {
  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#f3ead5" opacity="0.10"/>
    </pattern>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="10" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.65"/>
    </filter>
  </defs>

  <!-- Background Pattern -->
  <rect width="1200" height="630" fill="#063f2e"/>
  <rect width="1200" height="630" fill="url(#dotGrid)"/>

  <!-- Decorative Top Bar -->
  <rect x="0" y="0" width="1200" height="6" fill="#ffd400"/>
  <rect x="0" y="6" width="1200" height="3" fill="#df584a"/>
  <rect x="0" y="9" width="1200" height="3" fill="#39799b"/>

  <!-- Card Shadow Backdrop & Brutalist Outline -->
  <rect x="${cardLeft - 5}" y="${cardTop - 5}" width="${cardWidth + 10}" height="${cardHeight + 10}" rx="10" fill="#102d24" stroke="#ffd400" stroke-width="2.5" filter="url(#cardShadow)"/>

  <!-- Right Side Branding & Content -->
  <!-- Top Eyebrow Tag -->
  <g transform="translate(460, 85)">
    <rect x="0" y="0" width="145" height="30" rx="4" fill="#ffd400"/>
    <text x="72" y="20" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#102d24" text-anchor="middle" letter-spacing="1.5">HH GOA 2026</text>
    
    <text x="165" y="21" font-family="monospace, Consolas, Courier" font-size="14" font-weight="700" fill="#f3ead5" letter-spacing="2">2:47PM STUDIO</text>
  </g>

  <!-- Main Headline -->
  <g transform="translate(460, 180)">
    <text x="0" y="0" font-family="Impact, 'Arial Black', -apple-system, sans-serif" font-size="64" font-weight="900" fill="#f3ead5" letter-spacing="2">BUILDER PASS</text>
    <text x="0" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" fill="#ffd400" letter-spacing="4">#FrameInGoa</text>
  </g>

  <!-- 3-Stripe Decorative Divider -->
  <g transform="translate(460, 255)">
    <rect x="0" y="0" width="660" height="4" fill="#ffd400"/>
    <rect x="0" y="4" width="660" height="3" fill="#df584a"/>
    <rect x="0" y="7" width="660" height="3" fill="#39799b"/>
  </g>

  <!-- Retro Info Window Box -->
  <g transform="translate(460, 295)">
    <rect x="0" y="0" width="660" height="190" rx="6" fill="#f3ead5" stroke="#102d24" stroke-width="2"/>
    <!-- Window header -->
    <rect x="0" y="0" width="660" height="34" rx="6" fill="#102d24"/>
    <circle cx="20" cy="17" r="5" fill="#df584a"/>
    <circle cx="36" cy="17" r="5" fill="#ffd400"/>
    <circle cx="52" cy="17" r="5" fill="#39799b"/>
    <text x="80" y="22" font-family="monospace, Consolas" font-size="12" font-weight="700" fill="#f3ead5" letter-spacing="1">PASS_VERIFICATION // GOA_INDIA</text>

    <!-- Window Content -->
    <text x="24" y="72" font-family="monospace, Consolas" font-size="14" font-weight="700" fill="#102d24" letter-spacing="1">STATUS:</text>
    <text x="140" y="72" font-family="monospace, Consolas" font-size="14" font-weight="800" fill="#06452f">VERIFIED BUILDER ID PASS</text>

    <text x="24" y="108" font-family="monospace, Consolas" font-size="14" font-weight="700" fill="#102d24" letter-spacing="1">EVENT:</text>
    <text x="140" y="108" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#102d24">Hacker House Goa 2026</text>

    <text x="24" y="144" font-family="monospace, Consolas" font-size="14" font-weight="700" fill="#102d24" letter-spacing="1">TAG:</text>
    <text x="140" y="144" font-family="monospace, Consolas" font-size="14" font-weight="800" fill="#df584a">#FrameInGoa</text>
  </g>

  <!-- Bottom Footer Tagline -->
  <g transform="translate(460, 545)">
    <text x="0" y="0" font-family="monospace, Consolas" font-size="13" font-weight="700" fill="#f3ead5" opacity="0.85" letter-spacing="1.5">GENERATE YOUR BUILDER PASS • HH GOA 2026</text>
  </g>
</svg>`;
  return Buffer.from(svg);
}

export async function renderOgImage(
  sanitizedCard: Buffer,
  timeoutSeconds: number,
): Promise<Buffer> {
  const manifest = SHARE_PAGE_V1_MANIFEST;
  try {
    const cardBuffer = await sharp(sanitizedCard, { failOn: "warning" })
      .timeout({ seconds: timeoutSeconds })
      .resize({
        width: manifest.card.width,
        height: manifest.card.height,
        fit: "contain",
        withoutEnlargement: true,
        background: { r: 6, g: 63, b: 46, alpha: 0 },
      })
      .png()
      .toBuffer();

    const overlaySvg = buildOgOverlaySvg(
      manifest.card.left,
      manifest.card.top,
      manifest.card.width,
      manifest.card.height,
    );

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
        { input: overlaySvg, left: 0, top: 0 },
        { input: cardBuffer, left: manifest.card.left, top: manifest.card.top },
      ])
      .jpeg({ quality: 88, progressive: true, chromaSubsampling: "4:2:0" })
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

