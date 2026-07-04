import { cn } from "@/lib/utils";

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

export function ProgressMeter({
  value,
  label,
  className = "h-2",
  indicatorClassName = "bg-coral-500",
  trackClassName = "bg-sand-100"
}: {
  value: number;
  label: string;
  className?: string;
  indicatorClassName?: string;
  trackClassName?: string;
}) {
  const progress = clampProgress(value);

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={progress}
      className={cn("overflow-hidden rounded-full", trackClassName, className)}
      role="progressbar"
    >
      <div className={cn("h-full rounded-full", indicatorClassName)} style={{ width: `${progress}%` }} />
    </div>
  );
}
