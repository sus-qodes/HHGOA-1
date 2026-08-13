import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createScallopedClipPoints } from "../features/card-renderer";
import type { BuilderFrameId } from "../features/card-renderer/options";
import { builderIdV1Manifest } from "../templates/builder-id-v1/templateManifest";

function photoClipPath(): string {
  const { photo } = builderIdV1Manifest;
  return `polygon(${createScallopedClipPoints(photo)
    .map(
      ({ x, y }) =>
        `${String(((x - photo.bounds.x) / photo.bounds.width) * 100)}% ${String(((y - photo.bounds.y) / photo.bounds.height) * 100)}%`,
    )
    .join(",")})`;
}

function photoClipPointsSvg(): string {
  const { photo } = builderIdV1Manifest;
  return createScallopedClipPoints(photo)
    .map(
      ({ x, y }) =>
        `${String(((x - photo.bounds.x) / photo.bounds.width) * 300)},${String(((y - photo.bounds.y) / photo.bounds.height) * 300)}`,
    )
    .join(" ");
}

export interface PhotoAdjustModalProps {
  readonly isOpen: boolean;
  readonly photoUrl: string | null;
  readonly frameId: BuilderFrameId;
  readonly onClose: () => void;
  readonly onApply: (croppedFile: File) => void;
  readonly onDraftCrop?: (croppedFile: File) => void;
}

export function PhotoAdjustModal({
  isOpen,
  photoUrl,
  frameId,
  onClose,
  onApply,
  onDraftCrop,
}: PhotoAdjustModalProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isProcessing] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [prevPhotoUrl, setPrevPhotoUrl] = useState<string | null>(null);

  if (photoUrl !== prevPhotoUrl) {
    setPrevPhotoUrl(photoUrl);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  }

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => {
        const cropped = generateCroppedFile();
        if (cropped != null && onDraftCrop != null) {
          onDraftCrop(cropped);
        }
      }, 50);
      return () => {
        window.clearTimeout(timer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pan, zoom, rotation, isOpen, onDraftCrop]);

  if (!isOpen || photoUrl == null) {
    return null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    setPanStart({ ...pan });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    setPan({
      x: panStart.x + dx,
      y: panStart.y + dy,
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (isDragging) {
      setIsDragging(false);
      try {
        (event.currentTarget as HTMLElement).releasePointerCapture(
          event.pointerId,
        );
      } catch {
        // Pointer capture release safety fallback
      }
    }
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setZoom((current) => Math.min(3, Math.max(1, current + delta)));
  }

  function handleReset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  }

  function handleRotate() {
    setRotation((current) => (current + 90) % 360);
  }

  function generateCroppedFile(): File | null {
    if (imageRef.current == null || viewportRef.current == null) return null;
    const img = imageRef.current;
    const viewport = viewportRef.current;
    const viewportRect = viewport.getBoundingClientRect();

    // High-resolution square output canvas matching 1:1 card photo bounds
    const targetWidth = 800;
    const targetHeight = 800;
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");

    if (ctx == null) return null;

    const scaleFactor = targetHeight / viewportRect.height;

    ctx.save();
    ctx.translate(targetWidth / 2, targetHeight / 2);
    ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW: number;
    let drawH: number;

    if (imgAspect > 1) {
      drawH = targetHeight;
      drawW = targetHeight * imgAspect;
    } else {
      drawW = targetWidth;
      drawH = targetWidth / imgAspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const arr = dataUrl.split(",");
    const mimeMatch = /:(.*?);/u.exec(arr[0] ?? "");
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(arr[1] ?? "");
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], "adjusted-photo.jpg", { type: mime });
  }

  function handleSave() {
    const croppedFile = generateCroppedFile();
    if (croppedFile != null) {
      onApply(croppedFile);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-studio-paper/20 bg-[#033524] p-5 text-studio-paper shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-studio-paper/15 pb-3">
          <div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-studio-yellow">
              ADJUST YOUR PHOTO
            </h3>
            <p className="text-[0.65rem] text-studio-paper/70 font-mono">
              Drag to position • Scroll/slider to zoom
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex size-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-studio-paper hover:bg-studio-coral hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Interactive Viewport Stage matching exact card frame */}
        <div className="relative mx-auto flex w-full max-w-[280px] aspect-square items-center justify-center p-2">
          <div
            className="relative flex size-full cursor-grab active:cursor-grabbing items-center justify-center overflow-hidden bg-[#022217] shadow-2xl select-none touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            ref={viewportRef}
            style={{
              clipPath: photoClipPath(),
            }}
          >
            <img
              alt="Adjust target"
              draggable={false}
              ref={imageRef}
              src={photoUrl}
              style={{
                transform: `translate(${String(pan.x)}px, ${String(pan.y)}px) scale(${String(zoom)}) rotate(${String(rotation)}deg)`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                maxHeight: "100%",
                maxWidth: "100%",
                objectFit: "contain",
              }}
            />
          </div>

          {/* SVG Scalloped Frame Overlay Outline */}
          <svg
            className="pointer-events-none absolute inset-0 size-full select-none"
            viewBox="0 0 300 300"
          >
            <polygon
              fill="none"
              points={photoClipPointsSvg()}
              stroke="#F4D35E"
              strokeWidth="4"
            />
          </svg>

          {/* Micro HUD Indicator */}
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-studio-yellow/30 bg-black/70 px-2 py-0.5 font-mono text-[0.58rem] font-semibold text-studio-yellow backdrop-blur-md">
            <span className="size-1.5 animate-pulse rounded-full bg-studio-yellow" />
            <span>CARD {frameId === "frame-01" ? "02" : "01"} SCALLOPED FRAME</span>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="space-y-3 pt-1">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-studio-paper/80 shrink-0">
              ZOOM:
            </span>
            <button
              className="flex size-7 items-center justify-center rounded bg-white/10 font-mono text-xs font-bold hover:bg-white/20"
              onClick={() => {
                setZoom((z) => Math.max(1, z - 0.15));
              }}
              type="button"
            >
              -
            </button>
            <input
              className="w-full h-1.5 bg-studio-paper/20 rounded-lg appearance-none cursor-pointer accent-studio-yellow"
              max="3"
              min="1"
              onChange={(e) => {
                setZoom(Number.parseFloat(e.target.value));
              }}
              step="0.05"
              type="range"
              value={zoom}
            />
            <button
              className="flex size-7 items-center justify-center rounded bg-white/10 font-mono text-xs font-bold hover:bg-white/20"
              onClick={() => {
                setZoom((z) => Math.min(3, z + 0.15));
              }}
              type="button"
            >
              +
            </button>
            <span className="font-mono text-[0.65rem] text-studio-yellow w-10 text-right font-bold">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Secondary Actions Row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleRotate}
              className="flex items-center gap-1.5 rounded-lg border border-studio-paper/20 bg-white/5 px-3 py-1.5 font-mono text-xs font-semibold text-studio-paper hover:bg-white/15 transition-colors"
            >
              <span>🔄 ROTATE 90°</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-studio-paper/20 bg-white/5 px-3 py-1.5 font-mono text-xs font-semibold text-studio-paper/70 hover:bg-white/15 hover:text-studio-paper transition-colors"
            >
              <span>RESET</span>
            </button>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-studio-paper/15 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-xl border border-studio-paper/30 px-4 py-2 font-mono text-xs font-bold uppercase text-studio-paper hover:bg-white/10 transition-colors"
          >
            CANCEL
          </button>

          <button
            className="rounded-xl bg-studio-yellow px-5 py-2 font-mono text-xs font-bold uppercase text-studio-ink shadow-lg transition-transform hover:scale-[1.02] hover:bg-studio-coral hover:text-white disabled:opacity-50"
            disabled={isProcessing}
            onClick={() => {
              handleSave();
            }}
            type="button"
          >
            {isProcessing ? "PROCESSING..." : "APPLY PHOTO"}
          </button>
        </div>
      </div>
    </div>
  );
}
