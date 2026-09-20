"use client";

import { useId, useRef } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";

export function AdminConfirmSubmit({
  formId,
  title,
  body,
  triggerLabel,
  submitLabel,
  confirmationName = "confirmDelete",
  confirmationValue = "delete",
  destructive = true
}: {
  formId: string;
  title: string;
  body: string;
  triggerLabel: string;
  submitLabel: string;
  confirmationName?: string;
  confirmationValue?: string;
  destructive?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const Icon = destructive ? Trash2 : ShieldCheck;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={destructive ? "inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-lg bg-coral-500 px-3 text-sm font-bold text-white transition hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2" : "inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-lg bg-ocean-900 px-3 text-sm font-bold text-white transition hover:bg-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"}
      >
        <Icon className="size-4" aria-hidden="true" />
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-[min(92vw,30rem)] rounded-lg border border-ocean-900/10 bg-white p-0 text-ocean-900 shadow-soft backdrop:bg-ocean-950/60"
      >
        <div className="p-5">
          <h2 id={titleId} className="text-lg font-bold tracking-normal">{title}</h2>
          <p id={descriptionId} className="mt-2 text-sm font-semibold leading-6 text-ocean-900/62">{body}</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              name={confirmationName}
              value={confirmationValue}
              className={destructive ? "inline-flex min-h-10 items-center justify-center rounded-lg bg-coral-500 px-3 text-sm font-bold text-white transition hover:bg-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2" : "inline-flex min-h-10 items-center justify-center rounded-lg bg-ocean-900 px-3 text-sm font-bold text-white transition hover:bg-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"}
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
