import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonTone = "primary" | "secondary" | "ghost" | "light";

const toneClasses: Record<ButtonTone, string> = {
  primary: "bg-coral-500 text-white shadow-soft hover:bg-coral-700",
  secondary: "bg-ocean-900 text-white shadow-soft hover:bg-ocean-700",
  ghost: "bg-transparent text-ocean-900 hover:bg-ocean-50",
  light: "bg-white text-ocean-900 shadow-soft hover:bg-sand-50"
};

const baseClasses =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500";

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

