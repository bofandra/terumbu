import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonTone = "primary" | "secondary" | "ghost" | "light" | "donation" | "editorial";

const toneClasses: Record<ButtonTone, string> = {
  primary: "rounded-lg bg-kelp-500 text-white shadow-soft hover:bg-kelp-700",
  secondary: "rounded-lg bg-ocean-900 text-white shadow-soft hover:bg-ocean-700",
  ghost: "rounded-lg bg-transparent text-ocean-900 hover:bg-ocean-50",
  light: "rounded-lg bg-white text-ocean-900 shadow-soft hover:bg-sand-50",
  donation: "rounded-lg bg-coral-500 text-white shadow-soft hover:bg-coral-700",
  editorial: "rounded-full bg-[var(--public-blue)] text-white hover:bg-[var(--public-navy)]"
};

const baseClasses =
  "inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kelp-500";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
};

export function Button({ className, tone = "primary", ...props }: ButtonProps) {
  return <button className={cn(baseClasses, toneClasses[tone], className)} {...props} />;
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  tone?: ButtonTone;
};

export function ButtonLink({ className, tone = "primary", href, children, ...props }: ButtonLinkProps) {
  return (
    <Link href={href} className={cn(baseClasses, toneClasses[tone], className)} {...props}>
      {children}
    </Link>
  );
}
