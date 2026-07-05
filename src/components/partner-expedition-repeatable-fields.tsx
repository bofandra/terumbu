"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RepeatableRow = Record<string, string | number | null | undefined>;

type RepeatableFieldConfig = {
  kind?: "input" | "textarea" | "select" | "file";
  name: string;
  valueKey?: string;
  placeholder?: string;
  className?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number | string;
  options?: string[];
  hiddenExistingName?: string;
  hiddenExistingKey?: string;
};

type EditableRow = RepeatableRow & {
  rowKey: string;
};

export function RepeatableFields({
  rows,
  emptyRow,
  fields,
  addLabel,
  gridClassName = "grid gap-2 rounded-lg bg-sand-50 p-3 md:grid-cols-2",
  minRows = 1
}: {
  rows: RepeatableRow[];
  emptyRow: RepeatableRow;
  fields: RepeatableFieldConfig[];
  addLabel: string;
  gridClassName?: string;
  minRows?: number;
}) {
  const startingRows = rows.length > 0 ? rows : [emptyRow];
  const nextRowIndex = useRef(startingRows.length);
  const [items, setItems] = useState<EditableRow[]>(
    () => startingRows.map((row, index) => ({ ...row, rowKey: `row-${index}` }))
  );

  return (
    <div className="grid gap-3">
      {items.map((row, index) => (
        <div key={row.rowKey} className="grid gap-2">
          <div className={gridClassName}>
            {fields.map((field) => {
              const value = String(row[field.valueKey ?? field.name] ?? "");

              if (field.kind === "textarea") {
                return (
                  <textarea
                    key={field.name}
                    name={field.name}
                    defaultValue={value}
                    placeholder={field.placeholder}
                    className={cn(
                      "min-h-28 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-coral-500",
                      field.className
                    )}
                  />
                );
              }

              if (field.kind === "select") {
                return (
                  <select
                    key={field.name}
                    name={field.name}
                    defaultValue={value}
                    className={cn(
                      "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition focus:border-coral-500",
                      field.className
                    )}
                  >
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                );
              }

              if (field.kind === "file") {
                const existingValue = field.hiddenExistingKey ? String(row[field.hiddenExistingKey] ?? "") : "";

                return (
                  <div key={field.name} className="grid gap-2">
                    {field.hiddenExistingName ? <input type="hidden" name={field.hiddenExistingName} value={existingValue} /> : null}
                    {existingValue ? <Image src={existingValue} alt="" width={480} height={160} unoptimized className="h-24 w-full rounded-lg object-cover" /> : null}
                    <input
                      name={field.name}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className={cn(
                        "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-2 text-sm font-semibold text-ocean-900 outline-none transition file:mr-3 file:rounded-full file:border-0 file:bg-ocean-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-ocean-700 focus:border-coral-500",
                        field.className
                      )}
                    />
                  </div>
                );
              }

              return (
                <input
                  key={field.name}
                  name={field.name}
                  type={field.type ?? "text"}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  defaultValue={value}
                  placeholder={field.placeholder}
                  className={cn(
                    "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-coral-500",
                    field.className
                  )}
                />
              );
            })}
          </div>
          {items.length > minRows ? (
            <button
              type="button"
              className="inline-flex min-h-9 w-fit items-center gap-2 rounded-full px-3 text-xs font-bold text-ocean-900/62 transition hover:bg-ocean-50 hover:text-ocean-900"
              onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              aria-label="Remove row"
            >
              <X className="size-3.5" aria-hidden="true" />
              Remove
            </button>
          ) : null}
        </div>
      ))}
      <Button
        type="button"
        tone="ghost"
        className="w-fit rounded-lg border border-ocean-900/10 bg-white"
        onClick={() =>
          setItems((current) => {
            const rowKey = `row-${nextRowIndex.current}`;
            nextRowIndex.current += 1;

            return [...current, { ...emptyRow, rowKey }];
          })
        }
      >
        <Plus className="size-4" aria-hidden="true" />
        {addLabel}
      </Button>
    </div>
  );
}
