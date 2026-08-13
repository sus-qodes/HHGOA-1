import type { CSSProperties, HTMLAttributes } from "react";

import {
  getActionAsset,
  type ActionIconName,
} from "../brand/assetManifest";

interface ActionIconBaseProps
  extends Omit<
    HTMLAttributes<HTMLSpanElement>,
    "aria-hidden" | "aria-label" | "children" | "role"
  > {
  readonly name: ActionIconName;
  readonly size?: number;
}

type ActionIconAccessibilityProps =
  | {
      /** Icons inside labelled controls are decorative by default. */
      readonly decorative?: true;
      readonly label?: never;
    }
  | {
      /** Standalone icons must provide an accessible name. */
      readonly decorative: false;
      readonly label: string;
    };

export type ActionIconProps = ActionIconBaseProps &
  ActionIconAccessibilityProps;

export function ActionIcon({
  name,
  size = 24,
  decorative = true,
  label,
  style,
  ...imageProps
}: ActionIconProps) {
  const icon = getActionAsset(name);
  const resolvedStyle: CSSProperties = {
    aspectRatio: icon.aspectRatio,
    backgroundColor: "currentColor",
    display: "inline-block",
    flex: "0 0 auto",
    height: size,
    maskImage: `url("${icon.src}")`,
    maskPosition: "center",
    maskRepeat: "no-repeat",
    maskSize: "contain",
    verticalAlign: "middle",
    WebkitMaskImage: `url("${icon.src}")`,
    WebkitMaskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    width: size,
    ...style,
  };

  return (
    <span
      {...imageProps}
      style={resolvedStyle}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : (label ?? icon.defaultLabel)}
      role={decorative ? undefined : "img"}
    />
  );
}
