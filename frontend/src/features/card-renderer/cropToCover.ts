export interface CoverCrop {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
}

export function cropToCover(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CoverCrop {
  if (
    ![sourceWidth, sourceHeight, targetWidth, targetHeight].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  ) {
    throw new RangeError("Image and target dimensions must be positive.");
  }
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  if (sourceRatio > targetRatio) {
    const sourceCropWidth = sourceHeight * targetRatio;
    return {
      sourceX: (sourceWidth - sourceCropWidth) / 2,
      sourceY: 0,
      sourceWidth: sourceCropWidth,
      sourceHeight,
    };
  }
  const sourceCropHeight = sourceWidth / targetRatio;
  return {
    sourceX: 0,
    sourceY: (sourceHeight - sourceCropHeight) / 2,
    sourceWidth,
    sourceHeight: sourceCropHeight,
  };
}
