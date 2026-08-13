/**
 * The complete HH Goa 2026 palette.
 *
 * Keep color literals in this module (and source artwork) so UI components can
 * consume semantic tokens instead of introducing one-off colors.
 */
export const brandColors = {
  green: "#0B6839",
  yellow: "#FEE101",
  pink: "#FF0080",
  offwhite: "#FFFBE8",
  white: "#FFFFFF",
  ink: "#000000",
  mint: "#9AC95F",
} as const;

export type BrandColorName = keyof typeof brandColors;
export type BrandColorValue = (typeof brandColors)[BrandColorName];

export const brandCssVariables = {
  "--brand-green": brandColors.green,
  "--brand-yellow": brandColors.yellow,
  "--brand-pink": brandColors.pink,
  "--brand-offwhite": brandColors.offwhite,
  "--brand-white": brandColors.white,
  "--brand-ink": brandColors.ink,
  "--brand-mint": brandColors.mint,
} as const;

export const brandTokens = {
  colors: brandColors,
  fonts: {
    display: "Imbue",
    mono: "Victor Mono",
  },
  radii: {
    panel: "0px",
    pill: "999px",
  },
} as const;
