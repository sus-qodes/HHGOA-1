import { getBrandAsset } from "../../brand/assetManifest";
import type { BrandAssetSlot } from "../../brand";
import type { BuilderFrameId } from "./options";

const assetSlotsByFrame = {
  "frame-01": [
    "card.card01Background",
    "card.card01TopLayer",
  ],
  "frame-02": ["card.card02Background"],
} as const satisfies Readonly<Record<BuilderFrameId, readonly BrandAssetSlot[]>>;

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function beginImageLoad(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached !== undefined) return cached;

  const loading = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    let settled = false;

    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      resolve(image);
    };
    const rejectOnce = () => {
      if (settled) return;
      settled = true;
      reject(new Error(`Card artwork could not be loaded: ${src}`));
    };

    image.decoding = "async";
    image.onload = resolveOnce;
    image.onerror = rejectOnce;
    image.src = src;

    if (typeof image.decode === "function") {
      void image.decode().then(resolveOnce, () => {
        // `load` remains a useful fallback for browsers whose SVG decode
        // promise rejects even though the image itself is displayable.
      });
    }
  }).catch((error: unknown) => {
    imageCache.delete(src);
    throw error;
  });

  imageCache.set(src, loading);
  return loading;
}

export function getBuilderCardAssetSources(
  frameId?: BuilderFrameId,
): readonly string[] {
  const slots =
    frameId === undefined
      ? [...assetSlotsByFrame["frame-01"], ...assetSlotsByFrame["frame-02"]]
      : assetSlotsByFrame[frameId];
  return [...new Set(slots.map((slot) => getBrandAsset(slot, "export").src))];
}

export async function preloadBuilderCardAssets(
  frameId?: BuilderFrameId,
): Promise<void> {
  if (typeof Image === "undefined") return;
  await Promise.all(
    getBuilderCardAssetSources(frameId).map((src) => beginImageLoad(src)),
  );
}

export function loadCachedCardAsset(src: string): Promise<HTMLImageElement> {
  return beginImageLoad(src);
}
