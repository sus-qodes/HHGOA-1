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
  --color-hh-green: #0b6839;
  --color-hh-yellow: #fee101;
  --color-hh-pink: #ff0080;
  --color-hh-offwhite: #fffbe8;
  --color-hh-white: #ffffff;
  --color-hh-ink: #000000;
  --color-hh-mint: #9ac95f;

  --color-studio-green: #06452f;
  --color-studio-green-dark: #033524;
  --color-studio-paper: #efe4cc;
  --color-studio-paper-light: #f6ecd6;
  --color-studio-yellow: #f3bd23;
  --color-studio-coral: #df584a;
  --color-studio-blue: #39799b;
  --color-studio-ink: #102c21;
  --color-studio-muted: #8f8a72;

  --result-green: #063f2e;
  --result-green-dark: #002f23;
  --result-cream: #f3ead5;
  --result-yellow: #ffd400;
  --result-ink: #102d24;

  color-scheme: dark;
  font-family: "Victor Mono", ui-monospace, SFMono-Regular, Consolas, Monaco, "Liberation Mono", monospace;
  background: var(--result-green);
  color: var(--result-cream);
}

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  min-width: 320px;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0;
  padding: 0;
  background-color: var(--result-green);
  color: var(--result-cream);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--result-green);
  background-image: radial-gradient(
    circle,
    color-mix(in srgb, var(--result-cream) 10%, transparent) 0 0.65px,
    transparent 0.9px
  );
  background-size: 12px 12px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: hidden;
  position: relative;
  isolation: isolate;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background-color: var(--color-studio-green-dark);
  color: var(--color-studio-paper);
}

.header-inner {
  margin: 0 auto;
  display: flex;
  min-height: 4rem;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 0.375rem 1rem;
  max-width: 80rem;
}

@media (min-width: 640px) {
  .header-inner {
    padding-inline: 2rem;
  }
}

@media (min-width: 1024px) {
  .header-inner {
    padding-inline: 3.5rem;
  }
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--color-studio-yellow);
  text-decoration: none;
  text-transform: uppercase;
}

.brand-badge span:first-child {
  background: var(--color-studio-yellow);
  color: var(--color-studio-ink);
  padding: 0.2rem 0.45rem;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 900;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.header-nav a {
  color: var(--color-studio-paper);
  text-decoration: none;
  transition: color 150ms ease;
}

.header-nav a:hover {
  color: var(--color-studio-yellow);
}

.header-nav-tag {
  color: var(--color-studio-paper);
}

.header-stripes {
  width: 100%;
}
.stripe-yellow { height: 3px; background: var(--color-studio-yellow); }
.stripe-coral { height: 2px; background: var(--color-studio-coral); }
.stripe-blue { height: 2px; background: var(--color-studio-blue); }

.ambient-card {
  position: fixed;
  inset: 0;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  filter: blur(70px) saturate(0.7);
  opacity: 0.09;
  transform: scale(1.12);
  pointer-events: none;
  z-index: -1;
}

.main-content {
  display: grid;
  align-items: center;
  gap: clamp(32px, 5vw, 80px);
  grid-template-columns: minmax(360px, 0.95fr) minmax(400px, 1.05fr);
  width: min(1280px, 92vw);
  margin: 0 auto;
  padding: 1.5rem 0 3rem;
  min-height: 0;
}

.card-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.step-indicator {
  display: grid;
  grid-template-columns: auto minmax(4rem, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.66rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--result-cream) 86%, transparent);
  padding-bottom: 0.5rem;
}

.step-active {
  color: var(--result-yellow);
  font-weight: 700;
}

.step-line {
  height: 1px;
  background: color-mix(in srgb, var(--result-cream) 60%, transparent);
}

.card-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 0;
}

.card-image {
  display: block;
  max-width: 100%;
  max-height: 75dvh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(243, 234, 213, 0.15);
}

.info-content {
  color: var(--result-cream);
  min-width: 0;
}

.eyebrow {
  color: var(--result-yellow);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin: 0 0 0.5rem;
}

.headline {
  color: var(--result-cream);
  font-size: clamp(3.2rem, 6vw, 5.5rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 0.95;
  margin: 0;
  font-family: Impact, "Bebas Neue", "Arial Black", sans-serif;
  text-transform: uppercase;
}

.hindi-title {
  color: color-mix(in srgb, var(--result-cream) 90%, transparent);
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  font-weight: 700;
  margin: 0.25rem 0 0.75rem;
  letter-spacing: 0.02em;
}

.supporting-copy {
  color: color-mix(in srgb, var(--result-cream) 85%, transparent);
  font-size: 0.84rem;
  line-height: 1.7;
  margin: 0.75rem 0 1.25rem;
  max-width: 32rem;
}

.result-builder-window {
  background-color: var(--result-cream);
  border: 1.5px solid var(--result-ink);
  border-radius: 4px;
  box-shadow: 5px 6px 0 rgb(0 23 17 / 80%);
  color: var(--result-ink);
  margin-top: 1rem;
  max-width: 32rem;
  padding: 1.65rem 1.2rem 1rem;
  position: relative;
}

.result-window-controls {
  align-items: center;
  border-bottom: 1px solid var(--result-ink);
  display: flex;
  gap: 0.5rem;
  height: 1.35rem;
  inset: 0 0 auto;
  justify-content: flex-end;
  padding-right: 0.65rem;
  position: absolute;
}

.window-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.dot-coral { background: var(--color-studio-coral); }
.dot-yellow { background: var(--color-studio-yellow); }
.dot-blue { background: var(--color-studio-blue); }

.result-builder-window dl {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
}

.result-builder-window dl > div {
  align-items: baseline;
  display: grid;
  font-size: 0.72rem;
  gap: 0.8rem;
  grid-template-columns: 6.8rem auto minmax(0, 1fr);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.result-builder-window dt {
  font-weight: 700;
}

.result-builder-window dd {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-grid {
  display: grid;
  gap: 0.65rem;
  margin-top: 1.3rem;
  max-width: 32rem;
}

.action-button {
  align-items: center;
  border: 2px solid var(--result-cream);
  border-radius: 3px;
  display: grid;
  font-size: 0.78rem;
  font-weight: 700;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  height: 3rem;
  letter-spacing: 0.06em;
  padding-inline: 1rem;
  text-transform: uppercase;
  text-decoration: none;
  transition: all 150ms ease;
  width: 100%;
}

.action-button > span:first-child {
  grid-column: 2;
}

.action-button > span:last-child {
  grid-column: 3;
  justify-self: end;
}

.action-download {
  background: var(--result-yellow);
  border-color: var(--result-ink);
  color: var(--result-ink);
  box-shadow: 4px 4px 0 var(--result-ink);
}

.action-download:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 var(--result-ink);
}

.action-share {
  background: transparent;
  border-color: var(--result-cream);
  color: var(--result-cream);
}

.action-share:hover {
  background: var(--result-cream);
  color: var(--result-ink);
}

.action-another {
  background: transparent;
  border-color: color-mix(in srgb, var(--result-cream) 50%, transparent);
  color: color-mix(in srgb, var(--result-cream) 80%, transparent);
}

.action-another:hover {
  background: var(--result-cream);
  color: var(--result-ink);
  border-color: var(--result-cream);
}

.hashtag-note {
  color: color-mix(in srgb, var(--result-cream) 78%, transparent);
  font-size: 0.7rem;
  margin-top: 0.85rem;
  max-width: 32rem;
  text-align: center;
}

.hashtag-note strong {
  color: var(--result-yellow);
  font-weight: 600;
}

.site-footer {
  align-items: center;
  border-top: 1px dashed color-mix(in srgb, var(--result-yellow) 50%, transparent);
  color: color-mix(in srgb, var(--result-cream) 58%, transparent);
  display: flex;
  font-size: 0.62rem;
  gap: 1rem;
  justify-content: space-between;
  letter-spacing: 0.08em;
  padding: 1rem clamp(1rem, 4vw, 3.5rem);
  text-transform: uppercase;
  margin-top: auto;
}

.site-footer a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, currentColor 60%, transparent);
  text-underline-offset: 0.25rem;
}

.site-footer a:hover {
  color: var(--result-cream);
}

@media (max-width: 1023px) {
  .main-content {
    grid-template-columns: minmax(0, 1fr);
    padding: 1.5rem 1rem 2.5rem;
    gap: 2rem;
  }
  .card-image {
    max-height: 60dvh;
  }
  .result-builder-window, .actions-grid, .supporting-copy, .hashtag-note {
    max-width: 100%;
  }
  .site-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
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
  
  const xShareText = encodeURIComponent(
    `Just checked out this HH Goa 2026 Builder Pass! 🚀\n\nCreate your own Builder Card:\n${appOrigin}\n\n`,
  );
  const xShareUrl = `https://x.com/intent/tweet?text=${xShareText}&url=${encodeURIComponent(canonicalUrl)}&hashtags=FrameInGoa,HHGoa2026`;

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
  <div aria-hidden="true" class="ambient-card" style="background-image: url('${cardUrl}');"></div>

  <header class="site-header">
    <div class="header-inner">
      <a class="brand-badge" href="${generatorUrl}">
        <span>2:47</span>
        <span>STUDIO</span>
      </a>
      <nav class="header-nav" aria-label="Pass navigation">
        <a href="${generatorUrl}">Make a Pass</a>
        <span aria-hidden="true" class="header-nav-tag">#FrameInGoa</span>
      </nav>
    </div>
    <div class="header-stripes" aria-hidden="true">
      <div class="stripe-yellow"></div>
      <div class="stripe-coral"></div>
      <div class="stripe-blue"></div>
    </div>
  </header>

  <main class="main-content">
    <section class="card-panel" aria-label="Builder ID Card">
      <div class="step-indicator" aria-hidden="true">
        <span>01</span>
        <span class="step-line"></span>
        <span class="step-active">BUILDER ID PASS</span>
      </div>
      <div class="card-stage">
        <img
          class="card-image"
          src="${cardUrl}"
          width="${SHARE_IMAGE_CONTRACT.width}"
          height="${SHARE_IMAGE_CONTRACT.height}"
          alt="${CARD_ALT}"
          loading="eager"
        >
      </div>
    </section>

    <section class="info-content" aria-labelledby="card-heading">
      <p class="eyebrow">HH GOA 2026 • OFFICIAL BUILDER PASS</p>
      <h1 class="headline" id="card-heading">BUILDER PASS</h1>
      <p class="hindi-title" lang="hi">पास तैयार</p>
      <p class="supporting-copy">
        A verified Builder ID pass created for Hacker House Goa 2026. Keep building, connect with fellow builders, and frame your journey in Goa.
      </p>

      <div class="result-builder-window" aria-label="Pass Verification Details">
        <div class="result-window-controls" aria-hidden="true">
          <span class="window-dot dot-coral"></span>
          <span class="window-dot dot-yellow"></span>
          <span class="window-dot dot-blue"></span>
        </div>
        <dl>
          <div>
            <dt>PASS ID</dt>
            <dd>:</dd>
            <dd>${encodedShareId}</dd>
          </div>
          <div>
            <dt>EVENT</dt>
            <dd>:</dd>
            <dd>HACKER HOUSE GOA 2026</dd>
          </div>
          <div>
            <dt>LOCATION</dt>
            <dd>:</dd>
            <dd>GOA, INDIA</dd>
          </div>
          <div>
            <dt>STATUS</dt>
            <dd>:</dd>
            <dd style="color: var(--color-studio-green); font-weight: 800;">VERIFIED BUILDER ID</dd>
          </div>
          <div>
            <dt>TAG</dt>
            <dd>:</dd>
            <dd style="color: var(--color-studio-coral); font-weight: 700;">#FrameInGoa</dd>
          </div>
        </dl>
      </div>

      <div class="actions-grid">
        <a class="action-button action-download" href="${cardUrl}" download="HH-Goa-2026-Builder-Pass.png">
          <span>Download Pass</span>
          <span aria-hidden="true">↓</span>
        </a>
        <a class="action-button action-share" href="${xShareUrl}" target="_blank" rel="noopener noreferrer">
          <span>Share on X</span>
          <span aria-hidden="true">↗</span>
        </a>
        <a class="action-button action-another" href="${generatorUrl}">
          <span>Create Your Own Pass</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <p class="hashtag-note">
        Tag <strong>@247pmstudio</strong> and use <strong>#FrameInGoa</strong> on X
      </p>
    </section>
  </main>

  <footer class="site-footer">
    <div>2:47PM STUDIO × HACKER HOUSE GOA 2026</div>
    <div>#FrameInGoa • <a href="${generatorUrl}">Create Pass</a></div>
  </footer>
</body>
</html>`;
}
