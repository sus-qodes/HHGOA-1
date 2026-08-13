import { getBrandAsset } from "../../brand/assetManifest";
import { builderIdCard01V1Manifest } from "../../templates/builder-id-card01-v1/templateManifest";
import { builderIdV1Manifest } from "../../templates/builder-id-v1/templateManifest";
import { createCardDownloadFilename } from "../download";
import { loadCachedCardAsset } from "./assetCache";
import { cropToCover } from "./cropToCover";
import { deriveBuilderIdentity } from "./identity";
import { getBuilderFrameOption } from "./options";
import {
  createScallopedClipPoints,
  type ScallopedClipGeometry,
} from "./scallopedClip";
import type {
  BuilderCardInput,
  BuilderCardRenderMetadata,
  RenderedBuilderCard,
} from "./types";
import {
  normalizeDisplayText,
  validateBuilderCardInput,
} from "./validation";

type Drawable = CanvasImageSource & {
  readonly width: number;
  readonly height: number;
};

interface NormalizedBuilderCardInput {
  readonly name: string;
  readonly stackRole: string;
  readonly teamName: string | undefined;
  readonly techStack: readonly string[];
  readonly builderTitle: BuilderCardInput["builderTitle"];
  readonly frameId: BuilderCardInput["frameId"];
  readonly builderId: string;
}

type WithoutBytes<Metadata> = Metadata extends unknown
  ? Omit<Metadata, "bytes">
  : never;

interface RenderedCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly metadata: WithoutBytes<BuilderCardRenderMetadata>;
}

interface TemplateTextOptions {
  readonly nameFamily?: string;
  readonly nameWeight?: number;
  readonly uppercaseSmallCopy?: boolean;
}

export class CardRendererError extends Error {
  override readonly name = "CardRendererError";
  readonly code:
    | "INVALID_INPUT"
    | "DECODE_FAILED"
    | "CANVAS_UNAVAILABLE"
    | "ASSET_FAILED"
    | "EXPORT_FAILED";
  readonly validationErrors?: ReturnType<typeof validateBuilderCardInput>;

  constructor(
    code: CardRendererError["code"],
    message: string,
    validationErrors?: ReturnType<typeof validateBuilderCardInput>,
  ) {
    super(message);
    this.code = code;
    this.validationErrors = validationErrors;
  }
}

function isHeic(file: File): boolean {
  return /\.(?:heic|heif)$/iu.test(file.name) || /heic|heif/iu.test(file.type);
}

async function normalizePhoto(file: File): Promise<Blob> {
  if (!isHeic(file)) return file;
  try {
    const { default: heic2any } = await import("heic2any");
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const converted = Array.isArray(result) ? result[0] : result;
    if (converted === undefined || converted.size === 0) {
      throw new Error("HEIC conversion produced no image.");
    }
    return converted;
  } catch (error) {
    if (error instanceof CardRendererError) throw error;
    throw new CardRendererError(
      "DECODE_FAILED",
      "This HEIC photo could not be read. Try exporting it as JPG or PNG.",
    );
  }
}

async function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodePhoto(blob: Blob): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Safari can expose createImageBitmap while rejecting a format that an
      // HTMLImageElement can still decode.
    }
  }
  try {
    return await loadImageElement(blob);
  } catch {
    throw new CardRendererError(
      "DECODE_FAILED",
      "This photo could not be read. Try another image.",
    );
  }
}

function createCanvas(
  width: number,
  height: number,
): readonly [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new CardRendererError(
      "CANVAS_UNAVAILABLE",
      "Canvas is unavailable in this browser.",
    );
  }
  return [canvas, context];
}

function fitText(
  context: CanvasRenderingContext2D,
  value: string,
  maximumWidth: number,
  startingSize: number,
  family: string,
  weight: number,
  minimumSize = 16,
): number {
  let size = startingSize;
  do {
    context.font = `${String(weight)} ${String(size)}px ${family}`;
    if (context.measureText(value).width <= maximumWidth) return size;
    size -= 2;
  } while (size > minimumSize);
  return size;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(
          new CardRendererError(
            "EXPORT_FAILED",
            "The card PNG could not be exported.",
          ),
        );
      } else {
        resolve(blob);
      }
    }, "image/png");
  });
}

function addMetadataBytes(
  metadata: RenderedCanvas["metadata"],
  bytes: number,
): BuilderCardRenderMetadata {
  if (metadata.templateId === "builder-id-card01-v1") {
    return { ...metadata, bytes };
  }
  return { ...metadata, bytes };
}

function normalizeInput(input: BuilderCardInput): NormalizedBuilderCardInput {
  const name = normalizeDisplayText(input.name);
  const stackRole = normalizeDisplayText(input.stackRole);
  const normalizedTeamName = normalizeDisplayText(input.teamName ?? "");
  const techStack = (input.techStack ?? [])
    .map((item) => normalizeDisplayText(item))
    .filter((item) => item !== "")
    .slice(0, 5);
  return {
    name,
    stackRole,
    teamName: normalizedTeamName === "" ? undefined : normalizedTeamName,
    techStack,
    builderTitle: input.builderTitle,
    frameId: input.frameId,
    builderId: deriveBuilderIdentity(name, stackRole).builderId,
  };
}

function drawPhotoCover(
  context: CanvasRenderingContext2D,
  photo: Drawable,
  bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): void {
  const crop = cropToCover(
    photo.width,
    photo.height,
    bounds.width,
    bounds.height,
  );
  context.drawImage(
    photo,
    crop.sourceX,
    crop.sourceY,
    crop.sourceWidth,
    crop.sourceHeight,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  );
}

function traceScallopedClip(
  context: CanvasRenderingContext2D,
  clip: ScallopedClipGeometry,
): void {
  context.beginPath();
  for (const [index, point] of createScallopedClipPoints(clip).entries()) {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  }
  context.closePath();
}

async function loadTemplateFonts(
  input: NormalizedBuilderCardInput,
  copy: CopyLayout,
  options: TemplateTextOptions = {},
): Promise<void> {
  await document.fonts.ready;
  const nameFamily = options.nameFamily ?? "Imbue";
  const nameWeight = options.nameWeight ?? 700;
  const fontLoads = [
    document.fonts.load(
      `${String(nameWeight)} ${String(copy.name.fontSize)}px "${nameFamily}"`,
      input.name,
    ),
    document.fonts.load(
      `700 ${String(copy.stackRole.fontSize)}px "Victor Mono"`,
      input.stackRole,
    ),
    document.fonts.load(
      `700 ${String(copy.builderTitle.fontSize)}px "Victor Mono"`,
      input.builderTitle,
    ),
    document.fonts.load(
      `700 ${String(copy.builderId.fontSize)}px "Victor Mono"`,
      input.builderId,
    ),
  ];
  if (input.teamName !== undefined) {
    fontLoads.push(
      document.fonts.load(
        `700 ${String(copy.teamName.fontSize)}px "Victor Mono"`,
        input.teamName,
      ),
    );
  }
  await Promise.all(fontLoads);
}

interface CopyLayout {
  readonly builderId: { readonly x: number; readonly y: number; readonly width: number; readonly fontSize: number };
  readonly name: { readonly x: number; readonly y: number; readonly width: number; readonly fontSize: number };
  readonly stackRole: { readonly x: number; readonly y: number; readonly width: number; readonly fontSize: number };
  readonly builderTitle: { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly fontSize: number };
  readonly teamName: { readonly x: number; readonly y: number; readonly width: number; readonly fontSize: number };
  readonly xUsername: { readonly x: number; readonly y: number; readonly width: number; readonly fontSize: number };
}

function drawTemplateText(
  context: CanvasRenderingContext2D,
  input: NormalizedBuilderCardInput,
  copy: CopyLayout,
  options: TemplateTextOptions = {},
): void {
  context.textBaseline = "middle";
  context.fillStyle = "#003923";

  fitText(
    context,
    `BUILDER ID // ${input.builderId.replace(/^#/u, "")}`,
    copy.builderId.width,
    copy.builderId.fontSize,
    '"Victor Mono", monospace',
    700,
    10,
  );
  context.fillText(
    `BUILDER ID // ${input.builderId.replace(/^#/u, "")}`,
    copy.builderId.x,
    copy.builderId.y,
    copy.builderId.width,
  );

  const nameFamily = options.nameFamily ?? "Imbue";
  const nameWeight = options.nameWeight ?? 700;
  const nameFamilyCss = `"${nameFamily}", sans-serif`;
  const nameSize = fitText(
    context,
    input.name,
    copy.name.width,
    copy.name.fontSize,
    nameFamilyCss,
    nameWeight,
    24,
  );
  context.font = `${String(nameWeight)} ${String(nameSize)}px ${nameFamilyCss}`;
  context.fillText(input.name, copy.name.x, copy.name.y, copy.name.width);

  fitText(
    context,
    options.uppercaseSmallCopy ? input.stackRole.toUpperCase() : input.stackRole,
    copy.stackRole.width,
    copy.stackRole.fontSize,
    '"Victor Mono", monospace',
    700,
  );
  context.fillText(
    options.uppercaseSmallCopy ? input.stackRole.toUpperCase() : input.stackRole,
    copy.stackRole.x,
    copy.stackRole.y,
    copy.stackRole.width,
  );

  if (input.techStack.length > 0) {
    let currentX = copy.teamName.x - 8;
    const startY = copy.builderTitle.y - 45;
    const pillHeight = 25;
    const paddingX = 16;
    const gap = 8;

    for (const rawTag of input.techStack.slice(0, 5)) {
      const tag = rawTag.toUpperCase();
      context.font = '700 13px "Victor Mono", monospace';
      const textWidth = context.measureText(tag).width;
      const pillWidth = Math.round(textWidth + paddingX);

      // Draw dark green pill container
      context.fillStyle = "#003923";
      context.beginPath();
      if (typeof context.roundRect === "function") {
        context.roundRect(
          currentX,
          startY - pillHeight / 2,
          pillWidth,
          pillHeight,
          5,
        );
      } else {
        context.rect(
          currentX,
          startY - pillHeight / 2,
          pillWidth,
          pillHeight,
        );
      }
      context.fill();

      // Draw cream text
      context.fillStyle = "#FFFBE8";
      context.textAlign = "center";
      context.fillText(tag, currentX + pillWidth / 2, startY, pillWidth);

      currentX += pillWidth + gap;
    }
    context.textAlign = "start";
  }

  const builderTitle = input.builderTitle.toUpperCase();
  context.fillStyle = "#003923";
  context.fillRect(
    copy.builderTitle.x,
    copy.builderTitle.y - copy.builderTitle.height / 2,
    copy.builderTitle.width,
    copy.builderTitle.height,
  );
  fitText(
    context,
    builderTitle,
    copy.builderTitle.width - 16,
    copy.builderTitle.fontSize,
    '"Victor Mono", monospace',
    700,
    10,
  );
  context.fillStyle = "#FFFBE8";
  context.textAlign = "center";
  context.fillText(
    builderTitle,
    copy.builderTitle.x + copy.builderTitle.width / 2,
    copy.builderTitle.y,
    copy.builderTitle.width - 16,
  );
  context.textAlign = "start";
  context.fillStyle = "#003923";

  if (input.teamName !== undefined) {
    fitText(
      context,
      options.uppercaseSmallCopy ? input.teamName.toUpperCase() : input.teamName,
      copy.teamName.width,
      copy.teamName.fontSize,
      '"Victor Mono", monospace',
      700,
    );
    context.fillText(
      options.uppercaseSmallCopy ? input.teamName.toUpperCase() : input.teamName,
      copy.teamName.x,
      copy.teamName.y,
      copy.teamName.width,
    );
  }

}

async function renderCard01(
  photo: Drawable | undefined,
  input: NormalizedBuilderCardInput,
): Promise<RenderedCanvas> {
  const manifest = builderIdCard01V1Manifest;
  const [canvas, context] = createCanvas(
    manifest.canvas.width,
    manifest.canvas.height,
  );
  const backgroundSource = getBrandAsset(
    manifest.backgroundAssetSlot,
    "export",
  );
  const topLayerSource = getBrandAsset(manifest.topLayerAssetSlot, "export");
  const textOptions = {
    nameFamily: "Bebas Neue",
    nameWeight: 400,
    uppercaseSmallCopy: true,
  } as const;

  let background: HTMLImageElement;
  let topLayer: HTMLImageElement;
  try {
    [background, topLayer] = await Promise.all([
      loadCachedCardAsset(backgroundSource.src),
      loadCachedCardAsset(topLayerSource.src),
      loadTemplateFonts(input, manifest.copy, textOptions),
    ]);
  } catch {
    throw new CardRendererError(
      "ASSET_FAILED",
      "Card 01 artwork could not be prepared. Please try again.",
    );
  }

  // All artwork and live layers share the public 1134 x 1926 coordinate space.
  context.drawImage(
    background,
    0,
    0,
    manifest.artwork.width,
    manifest.artwork.height,
  );
  if (photo !== undefined) {
    context.save();
    traceScallopedClip(context, manifest.photo);
    context.clip();
    drawPhotoCover(context, photo, manifest.photo.bounds);
    context.restore();
  }
  drawTemplateText(context, input, manifest.copy, textOptions);
  // The supplied sleeve and lanyard are translucent foreground artwork and
  // must remain above both the live portrait and generated copy.
  context.drawImage(
    topLayer,
    0,
    0,
    manifest.artwork.width,
    manifest.artwork.height,
  );
  return {
    canvas,
    metadata: {
      templateId: manifest.id,
      templateVersion: manifest.version,
      width: manifest.canvas.width,
      height: manifest.canvas.height,
      mimeType: "image/png",
    },
  };
}

async function renderCard02(
  photo: Drawable | undefined,
  input: NormalizedBuilderCardInput,
): Promise<RenderedCanvas> {
  const manifest = builderIdV1Manifest;
  const [canvas, context] = createCanvas(
    manifest.canvas.width,
    manifest.canvas.height,
  );
  const backgroundSource = getBrandAsset(
    getBuilderFrameOption("frame-02").assetSlot,
    "export",
  );

  let background: HTMLImageElement;
  try {
    [background] = await Promise.all([
      loadCachedCardAsset(backgroundSource.src),
      loadTemplateFonts(input, manifest.copy),
    ]);
  } catch {
    throw new CardRendererError(
      "ASSET_FAILED",
      "Card 02 artwork could not be prepared. Please try again.",
    );
  }

  context.drawImage(
    background,
    0,
    0,
    manifest.artwork.width,
    manifest.artwork.height,
  );
  if (photo !== undefined) {
    context.save();
    traceScallopedClip(context, manifest.photo);
    context.clip();
    drawPhotoCover(context, photo, manifest.photo.bounds);
    context.restore();
  }
  context.save();
  context.translate(
    manifest.copy.rotationOrigin.x,
    manifest.copy.rotationOrigin.y,
  );
  context.rotate((manifest.copy.rotationDegrees * Math.PI) / 180);
  context.translate(
    -manifest.copy.rotationOrigin.x,
    -manifest.copy.rotationOrigin.y,
  );
  drawTemplateText(context, input, manifest.copy, {
    uppercaseSmallCopy: true,
  });
  context.restore();
  return {
    canvas,
    metadata: {
      templateId: manifest.id,
      templateVersion: manifest.version,
      width: manifest.canvas.width,
      height: manifest.canvas.height,
      mimeType: "image/png",
    },
  };
}

export async function renderBuilderCard(
  input: BuilderCardInput,
): Promise<RenderedBuilderCard> {
  const validationErrors = validateBuilderCardInput(input);
  if (Object.keys(validationErrors).length > 0) {
    throw new CardRendererError(
      "INVALID_INPUT",
      "Check the highlighted fields.",
      validationErrors,
    );
  }

  const normalizedInput = normalizeInput(input);
  const photo =
    input.photo === null || input.photo === undefined
      ? undefined
      : await decodePhoto(await normalizePhoto(input.photo));
  try {
    const rendered =
      normalizedInput.frameId === "frame-01"
        ? await renderCard01(photo, normalizedInput)
        : await renderCard02(photo, normalizedInput);
    const blob = await canvasToBlob(rendered.canvas);
    return {
      blob,
      filename: createCardDownloadFilename(normalizedInput.name),
      builderTitle: normalizedInput.builderTitle,
      builderId: normalizedInput.builderId,
      name: normalizedInput.name,
      stackRole: normalizedInput.stackRole,
      ...(normalizedInput.teamName === undefined
        ? {}
        : { teamName: normalizedInput.teamName }),
      ...(normalizedInput.techStack.length === 0
        ? {}
        : { techStack: normalizedInput.techStack }),
      frameId: normalizedInput.frameId,
      metadata: addMetadataBytes(rendered.metadata, blob.size),
    };
  } finally {
    if (
      photo !== undefined &&
      "close" in photo &&
      typeof photo.close === "function"
    ) {
      photo.close();
    }
  }
}
