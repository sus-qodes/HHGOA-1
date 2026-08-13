export function assertPngBlob(pngBlob: Blob): void {
  if (pngBlob.size === 0 || pngBlob.type.toLowerCase() !== "image/png") {
    throw new TypeError("A non-empty image/png Blob is required.");
  }
}

export async function readPngDimensions(
  pngBlob: Blob,
): Promise<{ readonly width: number; readonly height: number }> {
  assertPngBlob(pngBlob);
  const header = new Uint8Array(await pngBlob.slice(0, 24).arrayBuffer());
  const expectedSignature = [137, 80, 78, 71, 13, 10, 26, 10] as const;
  if (
    header.length < 24 ||
    expectedSignature.some((byte, index) => header[index] !== byte) ||
    String.fromCharCode(...header.slice(12, 16)) !== "IHDR"
  ) {
    throw new TypeError("The Blob does not contain a valid PNG header.");
  }
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

export function parseHttpUrl(value: string, label: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(`${label} must be an absolute HTTP(S) URL.`);
  }

  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    parsed.username !== "" ||
    parsed.password !== ""
  ) {
    throw new TypeError(`${label} must be an absolute HTTP(S) URL.`);
  }

  return parsed;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
