/**
 * Native-aspect coordinates measured from the supplied Card 01 v2 artwork.
 *
 * Every supplied SVG uses a 141.75 x 240.75 viewBox. The artwork coordinate
 * space keeps an exact eight-times scale so measured photo/copy positions stay
 * stable. The export canvas matches the complete tall artwork exactly, without
 * cropping, padding or stretching it.
 * `dataGuideAssetSlot` contains a fixed sample identity and is deliberately a
 * measurement/reference layer: generated exports paint equivalent live data
 * instead of copying that sample person into every card.
 */
export const builderIdCard01V1Manifest = Object.freeze({
  id: "builder-id-card01-v1" as const,
  version: 1 as const,
  nativeViewBox: {
    width: 141.75 as const,
    height: 240.75 as const,
    artworkScale: 8 as const,
  },
  artwork: { width: 1134 as const, height: 1926 as const },
  canvas: { width: 1134 as const, height: 1926 as const },
  backgroundAssetSlot: "card.card01Background" as const,
  dataGuideAssetSlot: "card.card01DataGuide" as const,
  topLayerAssetSlot: "card.card01TopLayer" as const,
  photo: {
    /** Scalloped opening traced from the sample portrait in data-pixels-v2. */
    bounds: { x: 463, y: 568.5, width: 209, height: 209 },
    center: { x: 567.5, y: 673 },
    radius: 104.5,
    lobes: 12 as const,
    innerRadiusRatio: 0.88 as const,
  },
  copy: {
    builderId: { x: 272, y: 833, width: 590, fontSize: 15 },
    name: { x: 272, y: 924, width: 590, fontSize: 62 },
    stackRole: { x: 272, y: 978, width: 590, fontSize: 19 },
    builderTitle: {
      x: 414,
      y: 1070,
      width: 328,
      height: 28,
      fontSize: 15,
    },
    teamName: { x: 420, y: 1105, width: 315, fontSize: 14 },
    /** Retained for schema compatibility; no approved painted slot exists. */
    xUsername: { x: 420, y: 1142, width: 315, fontSize: 14 },
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
      name: "card01-background",
      kind: "asset",
      assetSlot: "card.card01Background",
      bounds: { x: 0, y: 0, width: 1134, height: 1926 },
    },
    {
      name: "card01-data-placement-guide",
      kind: "reference-only",
      assetSlot: "card.card01DataGuide",
      bounds: { x: 0, y: 0, width: 1134, height: 1926 },
      paintedToExport: false,
    },
    {
      name: "builder-photo",
      kind: "scalloped-photo",
      bounds: { x: 463, y: 568.5, width: 209, height: 209 },
    },
    {
      name: "builder-copy",
      kind: "text",
      bounds: { x: 272, y: 821, width: 590, height: 350 },
    },
    {
      name: "card01-plastic-sleeve",
      kind: "asset",
      assetSlot: "card.card01TopLayer",
      bounds: { x: 0, y: 0, width: 1134, height: 1926 },
    },
  ] as const,
});

export type BuilderIdCard01V1Manifest = typeof builderIdCard01V1Manifest;
