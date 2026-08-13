import actionArrowUrl from "../assets/placeholders/action-arrow.svg?no-inline";
import actionRegenerateUrl from "../assets/placeholders/action-regenerate.svg?no-inline";
import card01BackgroundUrl from "../assets/cards/hhg-id-card-bg-v2.webp";
import card01TopLayerUrl from "../assets/cards/hhg-id-card-top-layer-v2.webp";
import card02BackgroundUrl from "../assets/cards/hhg-id-card-bg.webp";
const card01DataGuideUrl = "";
const card02DataGuideUrl = "";

export const BRAND_ASSET_SLOTS = [
  "card.card01Background",
  "card.card01DataGuide",
  "card.card01TopLayer",
  "card.card02Background",
  "card.card02DataGuide",
] as const;

export type BrandAssetSlot = (typeof BRAND_ASSET_SLOTS)[number];

export const BRAND_ASSET_VARIANTS = ["mobile", "desktop", "export"] as const;

export type BrandAssetVariant = (typeof BRAND_ASSET_VARIANTS)[number];

export const ACTION_ICON_NAMES = ["regenerate", "arrow"] as const;

export type ActionIconName = (typeof ACTION_ICON_NAMES)[number];

export type AssetAspectRatio = `${number} / ${number}`;

export interface AssetSource {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: AssetAspectRatio;
}

type AssetAccessibility =
  | { readonly decorative: true }
  | { readonly decorative: false; readonly alt: string };

export interface BrandAssetDefinition {
  readonly accessibility: AssetAccessibility;
  readonly variants: Readonly<Record<BrandAssetVariant, AssetSource>>;
}

export interface ActionIconDefinition extends AssetSource {
  readonly defaultLabel: string;
}

const source = (
  src: string,
  width: number,
  height: number,
  aspectRatio: AssetAspectRatio,
): AssetSource => ({ src, width, height, aspectRatio });

const cardNativeSource = (src: string) =>
  source(src, 1134, 1926, "189 / 321");
const card01Background = cardNativeSource(card01BackgroundUrl);
const card01DataGuide = cardNativeSource(card01DataGuideUrl);
const card01TopLayer = cardNativeSource(card01TopLayerUrl);
const card02Background = cardNativeSource(card02BackgroundUrl);
const card02DataGuide = cardNativeSource(card02DataGuideUrl);

/**
 * The only place where semantic UI roles are coupled to artwork files.
 * Replacing final artwork should require edits here, not in screen components.
 */
export const brandAssetManifest = {
  "card.card01Background": {
    accessibility: {
      decorative: false,
      alt: "HH Goa Card 01 background artwork",
    },
    variants: {
      mobile: card01Background,
      desktop: card01Background,
      export: card01Background,
    },
  },
  "card.card01DataGuide": {
    accessibility: { decorative: true },
    variants: {
      mobile: card01DataGuide,
      desktop: card01DataGuide,
      export: card01DataGuide,
    },
  },
  "card.card01TopLayer": {
    accessibility: { decorative: true },
    variants: {
      mobile: card01TopLayer,
      desktop: card01TopLayer,
      export: card01TopLayer,
    },
  },
  "card.card02Background": {
    accessibility: {
      decorative: false,
      alt: "HH Goa Card 02 background artwork",
    },
    variants: {
      mobile: card02Background,
      desktop: card02Background,
      export: card02Background,
    },
  },
  "card.card02DataGuide": {
    accessibility: { decorative: true },
    variants: {
      mobile: card02DataGuide,
      desktop: card02DataGuide,
      export: card02DataGuide,
    },
  },
} as const satisfies Readonly<Record<BrandAssetSlot, BrandAssetDefinition>>;

export const actionIconManifest = {
  regenerate: {
    ...source(actionRegenerateUrl, 48, 48, "1 / 1"),
    defaultLabel: "Generate another card",
  },
  arrow: {
    ...source(actionArrowUrl, 48, 48, "1 / 1"),
    defaultLabel: "Continue",
  },
} as const satisfies Readonly<Record<ActionIconName, ActionIconDefinition>>;

export const getBrandAsset = (
  slot: BrandAssetSlot,
  variant: BrandAssetVariant = "desktop",
): AssetSource => brandAssetManifest[slot].variants[variant];

export const getBrandAssetDefinition = (
  slot: BrandAssetSlot,
): BrandAssetDefinition => brandAssetManifest[slot];

export const getActionAsset = (
  name: ActionIconName,
): ActionIconDefinition => actionIconManifest[name];
