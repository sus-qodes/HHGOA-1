const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHUNK_TYPE_PATTERN = /^[A-Za-z]{4}$/u;
const MAX_PNG_CHUNKS = 4096;

export interface PngInspection {
  readonly chunkTypes: readonly string[];
  readonly animated: boolean;
}

export function hasPngSignature(input: Buffer): boolean {
  return (
    input.length >= PNG_SIGNATURE.length &&
    input.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  );
}

export function inspectPngStructure(input: Buffer): PngInspection {
  if (!hasPngSignature(input)) {
    throw new Error("PNG signature is missing.");
  }

  const chunkTypes: string[] = [];
  let offset = PNG_SIGNATURE.length;
  let sawHeader = false;
  let sawImageData = false;
  let sawEnd = false;

  while (offset < input.length) {
    if (offset + 12 > input.length) {
      throw new Error("PNG chunk header is truncated.");
    }

    const dataLength = input.readUInt32BE(offset);
    const type = input.toString("ascii", offset + 4, offset + 8);
    if (!CHUNK_TYPE_PATTERN.test(type)) {
      throw new Error("PNG chunk type is invalid.");
    }

    const end = offset + 12 + dataLength;
    if (end > input.length) {
      throw new Error("PNG chunk data is truncated.");
    }

    if (!sawHeader) {
      if (type !== "IHDR" || dataLength !== 13) {
        throw new Error("PNG IHDR must be the first chunk.");
      }
      sawHeader = true;
    } else if (type === "IHDR") {
      throw new Error("PNG contains multiple IHDR chunks.");
    }

    if (chunkTypes.length >= MAX_PNG_CHUNKS) {
      throw new Error("PNG contains too many chunks.");
    }
    chunkTypes.push(type);
    if (type === "IDAT") {
      sawImageData = true;
    }
    if (type === "IEND") {
      if (dataLength !== 0 || end !== input.length) {
        throw new Error("PNG IEND is malformed or has trailing data.");
      }
      sawEnd = true;
      offset = end;
      break;
    }

    offset = end;
  }

  if (!sawHeader || !sawImageData || !sawEnd || offset !== input.length) {
    throw new Error("PNG required chunks are missing.");
  }

  return {
    chunkTypes: Object.freeze(chunkTypes),
    animated: chunkTypes.includes("acTL"),
  };
}

export function retainPngChunks(
  input: Buffer,
  allowedTypes: ReadonlySet<string>,
): Buffer {
  inspectPngStructure(input);
  if (
    !allowedTypes.has("IHDR") ||
    !allowedTypes.has("IDAT") ||
    !allowedTypes.has("IEND")
  ) {
    throw new Error("The PNG chunk allowlist omits a required chunk.");
  }

  const retained = [input.subarray(0, PNG_SIGNATURE.length)];
  let offset = PNG_SIGNATURE.length;
  while (offset < input.length) {
    const dataLength = input.readUInt32BE(offset);
    const end = offset + 12 + dataLength;
    const type = input.toString("ascii", offset + 4, offset + 8);
    if (allowedTypes.has(type)) {
      retained.push(input.subarray(offset, end));
    }
    offset = end;
  }
  return Buffer.concat(retained);
}
