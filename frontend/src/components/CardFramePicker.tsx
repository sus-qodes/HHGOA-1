import {
  BUILDER_FRAME_OPTIONS,
  preloadBuilderCardAssets,
  type BuilderFrameId,
  type BuilderTitle,
} from "../features/card-renderer";
import { LiveCardPreview } from "./LiveCardPreview";

export interface CardFramePickerProps {
  readonly selected: BuilderFrameId;
  readonly onSelect: (frameId: BuilderFrameId) => void;
  readonly error?: string;
  readonly className?: string;
  readonly photoUrl?: string | null;
  readonly name?: string;
  readonly stackRole?: string;
  readonly teamName?: string;
  readonly techStack?: readonly string[];
  readonly builderTitle?: BuilderTitle;
}

export function CardFramePicker({
  selected,
  onSelect,
  error,
  className = "",
  photoUrl,
  name,
  stackRole,
  teamName,
  techStack,
  builderTitle,
}: CardFramePickerProps) {
  return (
    <fieldset
      aria-describedby={
        error === undefined ? "card-selector-help" : "card-selector-error"
      }
      className={`min-h-0 min-w-0 border-0 p-0 text-studio-paper ${className}`}
    >
      <legend className="sr-only">CHOOSE YOUR CARD</legend>

      <div className="card-selector-controls self-end">
        {/* Header Title & Count Row */}
        <div className="card-selector-heading flex items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 animate-pulse rounded-full bg-studio-yellow shadow-[0_0_8px_var(--color-studio-yellow)]"
            />
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-studio-yellow sm:text-sm">
              CHOOSE YOUR CARD
            </h2>
          </div>
          <p
            className="rounded-full border border-studio-yellow/30 bg-studio-paper/10 px-2.5 py-0.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-studio-yellow backdrop-blur-sm sm:text-xs"
            id="card-selector-help"
          >
            SELECT 1 OF {BUILDER_FRAME_OPTIONS.length}
          </p>
        </div>

        {/* Modern Segmented Tab Bar */}
        <div
          className="grid grid-flow-col auto-cols-fr gap-1.5 rounded-xl border border-studio-paper/25 bg-[#032e20]/90 p-1.5 shadow-lg backdrop-blur-md"
          role="presentation"
        >
          {BUILDER_FRAME_OPTIONS.map((option, index) => {
            const isSelected = selected === option.id;
            const number = String(index + 1).padStart(2, "0");
            const inputId = `card-option-${option.id}`;

            return (
              <label
                className={`relative flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3.5 py-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] transition-all duration-200 sm:min-h-12 sm:px-4 sm:text-xs ${
                  isSelected
                    ? "scale-[1.01] bg-[#efe4cc] text-[#033524] shadow-md before:absolute before:inset-x-3 before:top-0 before:h-[3px] before:rounded-full before:bg-studio-yellow"
                    : "text-[#efe4cc]/85 hover:bg-[#06452f] hover:text-[#efe4cc]"
                }`}
                htmlFor={inputId}
                key={option.id}
              >
                <input
                  aria-label={option.label}
                  checked={isSelected}
                  className="absolute inset-0 z-10 cursor-pointer opacity-0"
                  id={inputId}
                  name="selected-card"
                  onChange={() => {
                    onSelect(option.id);
                  }}
                  onFocus={() => {
                    void preloadBuilderCardAssets(option.id).catch(() => {});
                  }}
                  onPointerEnter={() => {
                    void preloadBuilderCardAssets(option.id).catch(() => {});
                  }}
                  type="radio"
                  value={option.id}
                />
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[0.62rem] ${
                      isSelected
                        ? "bg-black/10 text-[#033524]"
                        : "bg-white/10 text-[#efe4cc]"
                    }`}
                  >
                    {number}
                  </span>
                  <span>{option.label}</span>
                </div>
                {isSelected ? (
                  <span
                    aria-hidden="true"
                    className="ml-auto flex size-5 items-center justify-center rounded-full bg-studio-coral/15 text-xs font-black text-studio-coral"
                  >
                    ✓
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </div>

      {/* Modern Glassmorphic Card Display Stage */}
      <div className="card-selector-art min-h-0 pt-2">
        <div className="card-art-stage relative grid min-h-0 w-full place-items-center overflow-hidden rounded-2xl border border-studio-paper/25 bg-gradient-to-b from-[#06452f] via-[#033524] to-[#022217] p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
          {/* Ambient Lighting Gradient Overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-studio-yellow/10 via-transparent to-transparent opacity-80"
          />

          {/* Micro HUD Accents */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-3.5 flex items-center gap-1.5 font-mono text-[0.55rem] tracking-wider text-studio-paper/50"
          >
            <span className="size-1.5 rounded-full bg-studio-yellow" />
            <span>LIVE PREVIEW</span>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-3.5 font-mono text-[0.55rem] tracking-widest text-studio-paper/40"
          >
            2026 // STUDIO
          </div>

          <div className="relative z-10 flex min-h-0 w-full place-items-center justify-center py-1 transition-transform duration-300 hover:scale-[1.015]">
            <LiveCardPreview
              builderTitle={builderTitle}
              frameId={selected}
              key={selected}
              name={name}
              photoUrl={photoUrl}
              stackRole={stackRole}
              teamName={teamName}
              techStack={techStack}
            />
          </div>
        </div>

        <p
          className="card-selector-error mt-2 min-h-4 text-xs text-studio-yellow"
          id="card-selector-error"
        >
          {error}
        </p>
      </div>
    </fieldset>
  );
}
