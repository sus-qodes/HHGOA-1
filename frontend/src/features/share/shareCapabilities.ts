import { createCardDownloadFilename } from "../download";
import { assertPngBlob, parseHttpUrl } from "./shareValidation";

export type ShareCapabilityErrorCode =
  | "CLIPBOARD_UNAVAILABLE"
  | "FILE_API_UNAVAILABLE"
  | "NATIVE_SHARE_UNAVAILABLE";

export class ShareCapabilityError extends Error {
  override readonly name = "ShareCapabilityError";
  readonly code: ShareCapabilityErrorCode;

  constructor(code: ShareCapabilityErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface ClipboardWriter {
  writeText(value: string): Promise<void>;
}

export interface NativeShareNavigator {
  canShare?(data: ShareData): boolean;
  share?(data: ShareData): Promise<void>;
}

export type LocalCardFileFactory = (blob: Blob, filename: string) => File;

export interface NativeLocalShareOptions {
  readonly navigator?: NativeShareNavigator | null;
  readonly fileFactory?: LocalCardFileFactory;
  readonly title?: string;
  readonly text?: string;
}

function browserClipboard(): ClipboardWriter | null {
  return globalThis.navigator.clipboard;
}

function browserShareNavigator(): NativeShareNavigator | null {
  return globalThis.navigator;
}

function defaultFileFactory(blob: Blob, filename: string): File {
  if (typeof globalThis.File !== "function") {
    throw new ShareCapabilityError(
      "FILE_API_UNAVAILABLE",
      "This browser cannot create a local share file.",
    );
  }
  return new globalThis.File([blob], filename, { type: "image/png" });
}

export function canCopyShareLink(
  clipboard: ClipboardWriter | null = browserClipboard(),
): boolean {
  return clipboard !== null && typeof clipboard.writeText === "function";
}

export async function copyShareLink(
  shareUrl: string,
  clipboard: ClipboardWriter | null = browserClipboard(),
): Promise<void> {
  const canonicalUrl = parseHttpUrl(shareUrl, "Hosted share URL").toString();
  if (clipboard === null || typeof clipboard.writeText !== "function") {
    throw new ShareCapabilityError(
      "CLIPBOARD_UNAVAILABLE",
      "Clipboard access is not available in this browser.",
    );
  }
  await clipboard.writeText(canonicalUrl);
}

export function createLocalCardFile(
  pngBlob: Blob,
  personName: string,
  fileFactory: LocalCardFileFactory = defaultFileFactory,
): File {
  assertPngBlob(pngBlob);
  return fileFactory(pngBlob, createCardDownloadFilename(personName));
}

function nativeShareData(file: File, options: NativeLocalShareOptions): ShareData {
  return {
    files: [file],
    title: options.title ?? "HH Goa 2026 Builder ID",
    text: options.text ?? "#FrameInGoa",
  };
}

export function canNativeShareLocalCard(
  pngBlob: Blob,
  personName: string,
  options: NativeLocalShareOptions = {},
): boolean {
  const shareNavigator = options.navigator ?? browserShareNavigator();
  if (
    shareNavigator === null ||
    typeof shareNavigator.canShare !== "function" ||
    typeof shareNavigator.share !== "function"
  ) {
    return false;
  }

  try {
    const file = createLocalCardFile(
      pngBlob,
      personName,
      options.fileFactory,
    );
    return shareNavigator.canShare(nativeShareData(file, options));
  } catch {
    return false;
  }
}

export async function nativeShareLocalCard(
  pngBlob: Blob,
  personName: string,
  options: NativeLocalShareOptions = {},
): Promise<void> {
  const shareNavigator = options.navigator ?? browserShareNavigator();
  if (
    shareNavigator === null ||
    typeof shareNavigator.canShare !== "function" ||
    typeof shareNavigator.share !== "function"
  ) {
    throw new ShareCapabilityError(
      "NATIVE_SHARE_UNAVAILABLE",
      "Native file sharing is not available in this browser.",
    );
  }

  const file = createLocalCardFile(
    pngBlob,
    personName,
    options.fileFactory,
  );
  const shareData = nativeShareData(file, options);
  if (!shareNavigator.canShare(shareData)) {
    throw new ShareCapabilityError(
      "NATIVE_SHARE_UNAVAILABLE",
      "This browser cannot share the generated PNG file.",
    );
  }

  await shareNavigator.share(shareData);
}
