import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MetricValueProps = {
  as?: "p" | "span" | "h2" | "div";
  children: ReactNode;
  className?: string;
};

export function MetricValue({ as: Component = "p", children, className }: MetricValueProps) {
  return (
    <Component className={cn("min-w-0 max-w-full whitespace-normal break-words text-2xl font-bold leading-tight tracking-normal [overflow-wrap:anywhere]", className)}>
      {children}
    </Component>
  );
}
