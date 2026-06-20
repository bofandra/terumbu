import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  children
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.18em] text-coral-700">{eyebrow}</p> : null}
      <h2 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900 sm:text-4xl">{title}</h2>
      {children ? <div className="mt-4 text-base leading-7 text-ocean-900/68">{children}</div> : null}
    </div>
  );
}

