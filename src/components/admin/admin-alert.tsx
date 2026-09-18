import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminAlertTone = "success" | "error" | "info";

const toneClasses: Record<AdminAlertTone, string> = {
  success: "border-kelp-700/20 bg-kelp-100 text-kelp-700",
  error: "border-coral-700/20 bg-coral-100 text-coral-700",
  info: "border-ocean-900/10 bg-ocean-50 text-ocean-900"
};

export function AdminAlert({
  tone,
  title,
  children,
  className
}: {
  tone: AdminAlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-lg border px-4 py-3 text-sm font-bold", toneClasses[tone], className)}
    >
      {title ? <p>{title}</p> : null}
      <div className={title ? "mt-1 font-semibold" : undefined}>{children}</div>
    </div>
  );
}
