export const CARD_DOWNLOAD_PREFIX = "hhgoa-2026-builder-id";

const FALLBACK_PERSON_SLUG = "builder";
const MAX_PERSON_SLUG_LENGTH = 64;

export interface DownloadCardOptions {
  readonly document?: Document;
  readonly urlApi?: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
  readonly scheduleCleanup?: (cleanup: () => void) => void;
}

function personNameToSlug(personName: string): string {
  return personName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_PERSON_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

export function createCardDownloadFilename(personName: string): string {
  const personSlug = personNameToSlug(personName) || FALLBACK_PERSON_SLUG;
  return `${CARD_DOWNLOAD_PREFIX}-${personSlug}.png`;
}

function scheduleBrowserCleanup(cleanup: () => void): void {
  globalThis.setTimeout(cleanup, 0);
}

/**
 * Starts a browser download of the already-rendered card PNG.
 *
 * The caller retains ownership of the Blob. Only the temporary object URL made
 * for the download is released here.
 */
export function downloadCardPng(
  pngBlob: Blob,
  personName: string,
  options: DownloadCardOptions = {},
): string {
  if (pngBlob.size === 0 || pngBlob.type.toLowerCase() !== "image/png") {
    throw new TypeError("downloadCardPng requires a non-empty image/png Blob.");
  }

  const downloadDocument = options.document ?? globalThis.document;
  const urlApi = options.urlApi ?? globalThis.URL;
  const scheduleCleanup = options.scheduleCleanup ?? scheduleBrowserCleanup;
  const filename = createCardDownloadFilename(personName);
  const objectUrl = urlApi.createObjectURL(pngBlob);
  const anchor = downloadDocument.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  downloadDocument.body.append(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    scheduleCleanup(() => {
      urlApi.revokeObjectURL(objectUrl);
    });
  }

  return filename;
}
