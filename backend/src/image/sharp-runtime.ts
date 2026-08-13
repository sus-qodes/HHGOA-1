import sharp from "sharp";

let initialized = false;

export function initializeSharpRuntime(workerConcurrency: number): void {
  if (initialized) {
    return;
  }

  sharp.block({ operation: ["VipsForeignLoad"] });
  sharp.unblock({
    operation: ["VipsForeignLoadPngBuffer", "VipsForeignLoadJpegBuffer"],
  });
  sharp.cache({ memory: 32, files: 0, items: 100 });
  sharp.concurrency(Math.max(1, Math.min(workerConcurrency, 2)));
  initialized = true;
}

export function getSharpRuntimeSummary(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    versions: sharp.versions,
    pngInput: sharp.format.png.input.buffer,
    pngOutput: sharp.format.png.output.buffer,
    jpegOutput: sharp.format.jpeg.output.buffer,
  });
}
