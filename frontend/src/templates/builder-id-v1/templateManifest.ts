/**
 * Card 02 keeps the supplied 189:321 artwork at eight-times native size. The
 * publish canvas matches that artwork exactly, without crop, padding or scale.
 * The data-pixels SVG includes a fixed sample identity, so it is registered
 * and preloaded as an immutable geometry guide but never painted to exports.
 */
export const builderIdV1Manifest = Object.freeze({
  id: "builder-id-v1" as const,
  version: 1 as const,
  nativeViewBox: {
    width: 141.75 as const,
    height: 240.75 as const,
    artworkScale: 8 as const,
  },
  artwork: { width: 1134 as const, height: 1926 as const },
  canvas: { width: 1134 as const, height: 1926 as const },
  backgroundAssetSlot: "card.card02Background" as const,
  dataGuideAssetSlot: "card.card02DataGuide" as const,
  photo: {
    /** Inset opening inside the flower artwork measured from data-pixels.svg. */
    bounds: { x: 365, y: 365, width: 345, height: 345 },
    center: { x: 537.5, y: 537.5 },
    radius: 172.5,
    lobes: 10 as const,
    innerRadiusRatio: 0.91 as const,
  },
  copy: {
    rotationDegrees: -5 as const,
    rotationOrigin: { x: 567, y: 976 },
    builderId: { x: 166, y: 826, width: 620, fontSize: 17 },
    name: { x: 168, y: 936, width: 590, fontSize: 56 },
    stackRole: { x: 174, y: 1018, width: 590, fontSize: 22 },
    builderTitle: {
      x: 392,
      y: 1134,
      width: 320,
      height: 30,
      fontSize: 16,
    },
    teamName: { x: 397, y: 1173, width: 320, fontSize: 15 },
    /** Retained for schema compatibility; no approved painted slot exists. */
    xUsername: { x: 402, y: 1210, width: 320, fontSize: 15 },
  },
  paintedFields: [
    "builderId",
    "name",
    "stackRole",
    "builderTitle",
    "teamName",
  ] as const,
  layers: [
    {
      name: "card02-background",
      kind: "asset",
      assetSlot: "card.card02Background",
      bounds: { x: 0, y: 0, width: 1134, height: 1926 },
    },
    {
      name: "card02-data-placement-guide",
      kind: "reference-only",
      assetSlot: "card.card02DataGuide",
      bounds: { x: 0, y: 0, width: 1134, height: 1926 },
      paintedToExport: false,
    },
    {
      name: "builder-photo",
      kind: "scalloped-photo",
      bounds: { x: 365, y: 365, width: 345, height: 345 },
    },
    {
      name: "builder-copy",
      kind: "rotated-text",
      bounds: { x: 145, y: 810, width: 670, height: 430 },
    },
  ] as const,
});

export type BuilderIdV1Manifest = typeof builderIdV1Manifest;
