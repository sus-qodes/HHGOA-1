export interface StepIndicatorProps {
  readonly active: "create" | "result";
}

const steps = [
  { id: "create", label: "Build" },
  { id: "result", label: "Share" },
] as const;

export function StepIndicator({ active }: StepIndicatorProps) {
  return (
    <nav
      aria-label="Builder ID progress"
      className="result-progress"
    >
      <span aria-current={active === steps[0].id ? "step" : undefined}>01 BUILD</span>
      <span aria-hidden="true" className="result-progress-line" />
      <span aria-current={active === steps[1].id ? "step" : undefined}>02 SHARE</span>
    </nav>
  );
}
