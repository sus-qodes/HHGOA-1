import { ActionIcon } from "./ActionIcon";

export interface BuilderClassFieldProps {
  readonly value: string;
  readonly onRegenerate: () => void;
}

export function BuilderClassField({
  value,
  onRegenerate,
}: BuilderClassFieldProps) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label
          className="text-[0.66rem] font-medium uppercase tracking-[0.1em] text-studio-ink"
          htmlFor="builder-class"
        >
          Builder class
        </label>
        <span aria-hidden="true" className="text-[0.58rem] text-studio-muted">
          {value.length} / 30
        </span>
      </div>
      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          aria-label="Builder class"
          className="min-h-9 min-w-0 border border-studio-ink/75 bg-studio-paper-light px-3 text-sm font-medium uppercase tracking-[0.05em] text-studio-ink"
          id="builder-class"
          readOnly
          value={value}
        />
        <button
          aria-label="Regenerate"
          className="inline-flex min-h-9 items-center justify-center gap-2 border border-studio-ink/75 bg-studio-paper px-3 text-[0.6rem] font-medium uppercase tracking-[0.08em] text-studio-ink transition-colors hover:bg-studio-yellow focus-visible:outline-studio-coral"
          id="builder-class-regenerate"
          onClick={onRegenerate}
          type="button"
        >
          <ActionIcon name="regenerate" size={15} />
          <span className="hidden sm:inline">Regenerate</span>
        </button>
      </div>
    </div>
  );
}
