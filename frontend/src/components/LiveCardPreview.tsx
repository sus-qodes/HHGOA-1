import cardOneBackground from "../assets/cards/hhg-id-card-bg-v2.webp";
import cardOneTop from "../assets/cards/hhg-id-card-top-layer-v2.webp";
import cardTwoBackground from "../assets/cards/hhg-id-card-bg.webp";
import {
  deriveBuilderIdentity,
  type BuilderFrameId,
  type BuilderTitle,
} from "../features/card-renderer";
import { createScallopedClipPoints } from "../features/card-renderer";
import { builderIdCard01V1Manifest } from "../templates/builder-id-card01-v1/templateManifest";
import { builderIdV1Manifest } from "../templates/builder-id-v1/templateManifest";

export interface LiveCardPreviewProps {
  readonly frameId: BuilderFrameId;
  readonly photoUrl?: string | null;
  readonly name?: string;
  readonly stackRole?: string;
  readonly teamName?: string;
  readonly techStack?: readonly string[];
  readonly builderTitle?: BuilderTitle;
}

const artwork = {
  "frame-01": {
    background: cardOneBackground,
    top: cardOneTop,
    manifest: builderIdCard01V1Manifest,
    presentationNumber: "02",
  },
  "frame-02": {
    background: cardTwoBackground,
    top: undefined,
    manifest: builderIdV1Manifest,
    presentationNumber: "01",
  },
} as const;

function photoClipPath(): string {
  const { photo } = builderIdV1Manifest;
  return `polygon(${createScallopedClipPoints(photo)
    .map(
      ({ x, y }) =>
        `${String(((x - photo.bounds.x) / photo.bounds.width) * 100)}% ${String(((y - photo.bounds.y) / photo.bounds.height) * 100)}%`,
    )
    .join(",")})`;
}

function percent(value: number, total: number): string {
  return `${String((value / total) * 100)}%`;
}

function renderTechPillsSVG(
  tags: readonly string[],
  startX: number,
  startY: number,
) {
  let currentX = startX;
  const pillHeight = 25;
  const fontSize = 13;
  const pillRadius = 5;
  const gap = 8;
  const paddingX = 16;

  return tags.map((rawTag, idx) => {
    const tag = rawTag.toUpperCase();
    const approxTextWidth = tag.length * 8.2;
    const pillWidth = Math.round(approxTextWidth + paddingX);
    const x = currentX;
    currentX += pillWidth + gap;

    return (
      <g key={`${tag}-${String(idx)}`}>
        <rect
          fill="#003923"
          height={pillHeight}
          rx={pillRadius}
          width={pillWidth}
          x={x}
          y={startY - 12}
        />
        <text
          dominantBaseline="middle"
          fill="#FFFBE8"
          fontFamily='"Victor Mono", monospace'
          fontSize={fontSize}
          fontWeight={700}
          textAnchor="middle"
          x={x + pillWidth / 2}
          y={startY + 1}
        >
          {tag}
        </text>
      </g>
    );
  });
}

/**
 * Fast, real-time live preview. Renders native browser SVG layers and text,
 * updating instantly as the user types form details or uploads a photo.
 */
export function LiveCardPreview({
  frameId,
  photoUrl,
  name = "",
  stackRole = "",
  teamName = "",
  techStack = [],
  builderTitle = "Night Shipper",
}: LiveCardPreviewProps) {
  const selected = artwork[frameId];
  const { bounds } = selected.manifest.photo;

  const displayName = name.trim() !== "" ? name : "YOUR NAME";
  const displayStackRole = stackRole.trim() !== "" ? stackRole : "BUILDER / ROLE";
  const displayTeam = teamName.trim();
  const displayTitle = builderTitle;
  const activeTechTags =
    techStack.length > 0 ? techStack : ["REACT", "TYPESCRIPT", "NODE"];
  const { builderId: displayBuilderId } = deriveBuilderIdentity(
    displayName,
    displayStackRole,
  );

  return (
    <div
      aria-label={`HH Goa card ${selected.presentationNumber} live preview`}
      className="preview-card relative block w-full max-w-[21rem] aspect-[189/321] min-h-0 overflow-hidden rounded-2xl border-2 border-studio-paper/20 shadow-2xl transition-opacity duration-150"
      data-preview-frame={frameId}
      data-preview-state={photoUrl == null ? "empty" : "photo"}
      role="img"
    >
      <div className="absolute inset-0">
        <img
          alt=""
          className="absolute inset-0 block h-full w-full object-contain"
          fetchPriority="high"
          height={321}
          loading="eager"
          src={selected.background}
          width={189}
        />

        {photoUrl == null ? null : (
          <img
            alt="Builder preview"
            className="absolute object-cover"
            src={photoUrl}
            style={{
              clipPath: photoClipPath(),
              height: percent(bounds.height, selected.manifest.artwork.height),
              left: percent(bounds.x, selected.manifest.artwork.width),
              top: percent(bounds.y, selected.manifest.artwork.height),
              width: percent(bounds.width, selected.manifest.artwork.width),
            }}
          />
        )}

        {/* Real-time SVG Text Overlay Layer */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          viewBox="0 0 1134 1926"
        >
          {frameId === "frame-01" ? (
            <g>
              <text
                fill="#003923"
                fontFamily='"Victor Mono", monospace'
                fontSize={15}
                fontWeight={700}
                x={272}
                y={833}
              >
                BUILDER ID // {displayBuilderId.replace(/^#/u, "")}
              </text>
              <text
                fill="#003923"
                fontFamily='"Bebas Neue", sans-serif'
                fontSize={62}
                fontWeight={400}
                x={270}
                y={924}
              >
                {displayName.toUpperCase()}
              </text>
              <text
                fill="#003923"
                fontFamily='"Victor Mono", monospace'
                fontSize={19}
                fontWeight={700}
                x={272}
                y={976}
              >
                {displayStackRole.toUpperCase()}
              </text>

              {/* Tech Stack rendered as Pills with text aligned to Team Name X position */}
              {renderTechPillsSVG(activeTechTags, 412, 1032)}

              <rect
                fill="#003923"
                height={28}
                width={328}
                x={414}
                y={1070 - 14}
              />
              <text
                dominantBaseline="middle"
                fill="#FFFBE8"
                fontFamily='"Victor Mono", monospace'
                fontSize={15}
                fontWeight={700}
                textAnchor="middle"
                x={414 + 164}
                y={1070}
              >
                {displayTitle.toUpperCase()}
              </text>
              {displayTeam !== "" ? (
                <text
                  fill="#003923"
                  fontFamily='"Victor Mono", monospace'
                  fontSize={14}
                  fontWeight={700}
                  x={420}
                  y={1112}
                >
                  {displayTeam.toUpperCase()}
                </text>
              ) : null}
            </g>
          ) : (
            <g transform="rotate(-5, 567, 976)">
              <text
                fill="#003923"
                fontFamily='"Victor Mono", monospace'
                fontSize={17}
                fontWeight={700}
                x={166}
                y={826}
              >
                BUILDER ID // {displayBuilderId.replace(/^#/u, "")}
              </text>
              <text
                fill="#003923"
                fontFamily='"Imbue", sans-serif'
                fontSize={80}
                fontWeight={700}
                x={175}
                y={950}
              >
                {displayName}
              </text>
              <text
                fill="#003923"
                fontFamily='"Victor Mono", monospace'
                fontSize={22}
                fontWeight={700}
                x={180}
                y={1018}
              >
                {displayStackRole.toUpperCase()}
              </text>

              {/* Tech Stack rendered as Pills with text aligned to Team Name X position */}
              {renderTechPillsSVG(activeTechTags, 389, 1078)}

              <rect
                fill="#003923"
                height={30}
                width={320}
                x={392}
                y={1134 - 15}
              />
              <text
                dominantBaseline="middle"
                fill="#FFFBE8"
                fontFamily='"Victor Mono", monospace'
                fontSize={16}
                fontWeight={700}
                textAnchor="middle"
                x={392 + 160}
                y={1134}
              >
                {displayTitle.toUpperCase()}
              </text>
              {displayTeam !== "" ? (
                <text
                  fill="#003923"
                  fontFamily='"Victor Mono", monospace'
                  fontSize={15}
                  fontWeight={700}
                  x={397}
                  y={1175}
                >
                  {displayTeam.toUpperCase()}
                </text>
              ) : null}
            </g>
          )}
        </svg>

        {selected.top === undefined ? null : (
          <img
            alt=""
            className="pointer-events-none absolute inset-0 block h-full w-full object-contain"
            height={321}
            loading="eager"
            src={selected.top}
            width={189}
          />
        )}
      </div>
    </div>
  );
}
