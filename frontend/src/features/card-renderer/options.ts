import type { BrandAssetSlot } from "../../brand";

export const BUILDER_TITLE_OPTIONS = [
  "Night Shipper",
  "Kernel Alchemist",
  "Zero-Knowledge Nomad",
  "Cyber Shaman",
  "High-Frequency Architect",
  "Terminal Surfer",
  "Full-Stack Shredder",
  "Prompt Engine Driver",
] as const;

export type BuilderTitle = (typeof BUILDER_TITLE_OPTIONS)[number];

export const DEFAULT_BUILDER_TITLE: BuilderTitle = BUILDER_TITLE_OPTIONS[0];

export interface BuilderFrameOption {
  readonly id: "frame-01" | "frame-02";
  readonly label: string;
  readonly description: string;
  readonly assetSlot: BrandAssetSlot;
}

export const BUILDER_FRAME_OPTIONS = [
  {
    id: "frame-02",
    label: "CARD 01",
    description: "The official tall HH Goa cat collage with a flower photo frame.",
    assetSlot: "card.card02Background",
  },
  {
    id: "frame-01",
    label: "CARD 02",
    description: "The official HH Goa badge and transparent yellow lanyard sleeve.",
    assetSlot: "card.card01Background",
  },
] as const satisfies readonly BuilderFrameOption[];

export type BuilderFrameId = (typeof BUILDER_FRAME_OPTIONS)[number]["id"];

export const DEFAULT_BUILDER_FRAME_ID: BuilderFrameId =
  BUILDER_FRAME_OPTIONS[0].id;

const builderTitles = new Set<string>(BUILDER_TITLE_OPTIONS);
const builderFrameIds = new Set<string>(
  BUILDER_FRAME_OPTIONS.map(({ id }) => id),
);

export function isBuilderTitle(value: string): value is BuilderTitle {
  return builderTitles.has(value);
}

export function isBuilderFrameId(value: string): value is BuilderFrameId {
  return builderFrameIds.has(value);
}

export function getBuilderFrameOption(
  frameId: BuilderFrameId,
): BuilderFrameOption {
  return (
    BUILDER_FRAME_OPTIONS.find(({ id }) => id === frameId) ??
    BUILDER_FRAME_OPTIONS[0]
  );
}
