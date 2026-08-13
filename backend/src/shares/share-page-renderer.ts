import { createHash } from "node:crypto";

import {
  OG_IMAGE_CONTRACT,
  SHARE_IMAGE_CONTRACT,
} from "../config/constants.js";
import { isShareId } from "./share-id.js";

const PAGE_TITLE = "HH Goa 2026 Builder Pass";
const PAGE_DESCRIPTION = "A Builder Pass made for HH Goa 2026. #FrameInGoa";
const CARD_ALT = "HH Goa 2026 Builder Pass card";

export interface SharePageRendererInput {
  readonly shareId: string;
  readonly publicShareBaseUrl: string;
  readonly publicAppUrl: string;
  readonly cardUrl?: string;
  readonly ogImageUrl?: string;
}

export const SHARE_PAGE_STYLE = `:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #081226;
  color: #f8fafc;
}
* {
  box-sizing: border-box;
}
body {
  min-width: 18rem;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 8%, rgba(241, 92, 74, 0.22), transparent 31rem),
    radial-gradient(circle at 90% 90%, rgba(248, 188, 69, 0.16), transparent 34rem),
    #081226;
}
main {
  width: min(100% - 2rem, 70rem);
  height: 100vh;
  height: 100dvh;
  margin-inline: auto;
  padding: clamp(0.75rem, 2vh, 1.5rem) 0;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
}
.brand {
  margin: 0 0 0.5rem;
  color: #f8bc45;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
h1 {
  max-width: 16ch;
  margin: 0;
  font-size: clamp(2rem, 8vw, 4.5rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
}
.intro {
  max-width: 38rem;
  margin: clamp(0.5rem, 1.5vh, 1rem) 0 clamp(0.75rem, 2vh, 1.5rem);
  color: #cbd5e1;
  font-size: 1.05rem;
  line-height: 1.65;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 33.75rem) minmax(15rem, 1fr);
  gap: clamp(1.5rem, 5vw, 4rem);
  align-items: center;
  min-height: 0;
}
.card-frame {
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
  place-items: center;
}
.card {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  max-height: 100%;
  filter: drop-shadow(0 1.5rem 2rem rgba(0, 0, 0, 0.34));
  object-fit: contain;
}
.details {
  display: grid;
  gap: 1rem;
}
.details h2 {
  margin: 0;
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  line-height: 1.1;
}
.details p {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.6;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.button {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  border: 1px solid #f15c4a;
  border-radius: 999px;
  padding: 0.75rem 1.1rem;
  color: #ffffff;
  font-weight: 750;
  text-decoration: none;
}
.button-primary {
  background: #f15c4a;
}
.button:hover,
.button:focus-visible {
  border-color: #f8bc45;
  outline: 3px solid rgba(248, 188, 69, 0.35);
  outline-offset: 3px;
}
.button-primary:hover,
.button-primary:focus-visible {
  background: #d94838;
}
@media (max-width: 48rem) {
  main {
    padding: clamp(0.5rem, 2vh, 1rem) 0;
  }
  .brand {
    margin-bottom: 0.25rem;
    font-size: 0.7rem;
  }
  h1 {
    font-size: clamp(1.75rem, 9vw, 2.5rem);
  }
  .intro {
    display: none;
  }
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: clamp(0.5rem, 1.5vh, 1rem);
  }
  .details {
    max-width: 34rem;
    gap: 0.5rem;
  }
  .details h2 {
    font-size: clamp(1.2rem, 6vw, 1.75rem);
  }
  .details p {
    font-size: 0.85rem;
    line-height: 1.35;
  }
  .actions {
    margin-top: 0;
  }
  .button {
    min-height: 2.5rem;
    padding: 0.55rem 0.85rem;
    font-size: 0.85rem;
  }
}`;

export const SHARE_PAGE_STYLE_CSP_HASH = `sha256-${createHash("sha256")
  .update(SHARE_PAGE_STYLE, "utf8")
  .digest("base64")}`;

export const SHARE_PAGE_STYLE_CSP_SOURCE = `'${SHARE_PAGE_STYLE_CSP_HASH}'`;

function requirePublicOrigin(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`${name} must be an absolute HTTP or HTTPS origin.`);
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    (url.pathname !== "" && url.pathname !== "/")
  ) {
    throw new TypeError(`${name} must be an absolute HTTP or HTTPS origin.`);
  }

  return url.origin;
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function absoluteUrl(origin: string, path: string): string {
  return new URL(path, `${origin}/`).href;
}

function requirePublicAssetUrl(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`${name} must be an absolute HTTP or HTTPS URL.`);
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new TypeError(`${name} must be an absolute HTTP or HTTPS URL.`);
  }
  return url.href;
}

export function renderSharePage(input: SharePageRendererInput): string {
  if (!isShareId(input.shareId)) {
    throw new TypeError("shareId must be a 32-character base64url identifier.");
  }

  const shareOrigin = requirePublicOrigin(
    input.publicShareBaseUrl,
    "PUBLIC_SHARE_BASE_URL",
  );
  const appOrigin = requirePublicOrigin(input.publicAppUrl, "PUBLIC_APP_URL");
  const encodedShareId = encodeURIComponent(input.shareId);
  const sharePath = `/pass/${encodedShareId}`;
  const canonicalUrl = escapeHtmlAttribute(
    absoluteUrl(shareOrigin, sharePath),
  );
  const ogImageUrl = escapeHtmlAttribute(
    input.ogImageUrl === undefined
      ? absoluteUrl(shareOrigin, `${sharePath}/og.jpg`)
      : requirePublicAssetUrl(input.ogImageUrl, "ogImageUrl"),
  );
  const cardUrl = escapeHtmlAttribute(
    input.cardUrl === undefined
      ? absoluteUrl(shareOrigin, `${sharePath}/card.png`)
      : requirePublicAssetUrl(input.cardUrl, "cardUrl"),
  );
  const generatorUrl = escapeHtmlAttribute(absoluteUrl(appOrigin, "/"));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${PAGE_TITLE}</title>
  <meta name="description" content="${PAGE_DESCRIPTION}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="HH Goa 2026">
  <meta property="og:title" content="${PAGE_TITLE}">
  <meta property="og:description" content="${PAGE_DESCRIPTION}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:secure_url" content="${ogImageUrl}">
  <meta property="og:image:type" content="${OG_IMAGE_CONTRACT.mimeType}">
  <meta property="og:image:width" content="${OG_IMAGE_CONTRACT.width}">
  <meta property="og:image:height" content="${OG_IMAGE_CONTRACT.height}">
  <meta property="og:image:alt" content="${CARD_ALT}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@247pmstudio">
  <meta name="twitter:title" content="${PAGE_TITLE}">
  <meta name="twitter:description" content="${PAGE_DESCRIPTION}">
  <meta name="twitter:image" content="${ogImageUrl}">
  <meta name="twitter:image:alt" content="${CARD_ALT}">
  <style>${SHARE_PAGE_STYLE}</style>
</head>
<body>
  <main>
    <p class="brand">HH Goa 2026</p>
    <h1>Builder Pass</h1>
    <p class="intro">A share-ready Builder Pass made for HH Goa 2026.</p>
    <div class="layout">
      <div class="card-frame">
        <img class="card" src="${cardUrl}" width="${SHARE_IMAGE_CONTRACT.width}" height="${SHARE_IMAGE_CONTRACT.height}" alt="${CARD_ALT}">
      </div>
      <section class="details" aria-labelledby="card-actions-title">
        <h2 id="card-actions-title">Keep building.</h2>
        <p>Download this finished card or head back to the generator to make another.</p>
        <div class="actions">
          <a class="button button-primary" href="${cardUrl}" download="HH-Goa-2026-Builder-Pass.png">Download card</a>
          <a class="button" href="${generatorUrl}">Back to generator</a>
        </div>
      </section>
    </div>
  </main>
</body>
</html>`;
}
