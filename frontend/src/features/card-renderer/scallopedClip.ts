export interface ScallopedClipGeometry {
  readonly center: { readonly x: number; readonly y: number };
  readonly radius: number;
  readonly lobes: number;
  readonly innerRadiusRatio: number;
}

export interface ScallopedClipPoint {
  readonly angle: number;
  readonly x: number;
  readonly y: number;
}

/** Samples one, and only one, turn around a rounded radial wave. */
export function createScallopedClipPoints(
  clip: ScallopedClipGeometry,
  samplesPerLobe = 24,
): readonly ScallopedClipPoint[] {
  if (!Number.isInteger(samplesPerLobe) || samplesPerLobe < 2) {
    throw new RangeError("Scalloped clip samples per lobe must be at least 2.");
  }
  if (!Number.isInteger(clip.lobes) || clip.lobes < 3) {
    throw new RangeError("A scalloped clip needs at least 3 lobes.");
  }
  if (
    !Number.isFinite(clip.radius) ||
    clip.radius <= 0 ||
    !Number.isFinite(clip.innerRadiusRatio) ||
    clip.innerRadiusRatio <= 0 ||
    clip.innerRadiusRatio > 1
  ) {
    throw new RangeError("Scalloped clip radii must be positive and finite.");
  }

  const steps = clip.lobes * samplesPerLobe;
  const middleRadiusRatio = (1 + clip.innerRadiusRatio) / 2;
  const radiusAmplitude = (1 - clip.innerRadiusRatio) / 2;
  return Array.from({ length: steps + 1 }, (_, step) => {
    const angle = -Math.PI / 2 + (step * 2 * Math.PI) / steps;
    const waveAngle = clip.lobes * (angle + Math.PI / 2);
    const radius =
      clip.radius *
      (middleRadiusRatio + radiusAmplitude * Math.cos(waveAngle));
    return {
      angle,
      x: clip.center.x + Math.cos(angle) * radius,
      y: clip.center.y + Math.sin(angle) * radius,
    };
  });
}
