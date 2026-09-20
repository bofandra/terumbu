"use client";

import { useEffect } from "react";

type DraftEntry = [name: string, value: string];

const excludedFieldNames = new Set(["errorReturnTo", "savedReturnTo", "returnTo", "confirmDelete"]);
const maxDraftEntries = 200;
const maxDraftValueLength = 20_000;

function storableFormData(form: HTMLFormElement): DraftEntry[] {
  const entries: DraftEntry[] = [];

  for (const [name, rawValue] of new FormData(form).entries()) {
    if (!name || excludedFieldNames.has(name) || rawValue instanceof File) continue;

    entries.push([name, String(rawValue).slice(0, maxDraftValueLength)]);

    if (entries.length >= maxDraftEntries) break;
  }

  return entries;
}

function readDraft(storageKey: string): DraftEntry[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry): entry is DraftEntry =>
          Array.isArray(entry) &&
          entry.length === 2 &&
          typeof entry[0] === "string" &&
          typeof entry[1] === "string" &&
          entry[0].length > 0
      )
      .slice(0, maxDraftEntries);
  } catch {
    return [];
  }
}

function restoreDraft(form: HTMLFormElement, entries: DraftEntry[]) {
  const valuesByName = new Map<string, string[]>();

  for (const [name, value] of entries) {
    valuesByName.set(name, [...(valuesByName.get(name) ?? []), value]);
  }

  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) continue;
    if (!element.name || excludedFieldNames.has(element.name)) continue;

    const values = valuesByName.get(element.name);
    if (!values) continue;

    if (element instanceof HTMLInputElement) {
      if (["file", "password", "hidden", "submit", "button"].includes(element.type)) continue;

      if (element.type === "checkbox" || element.type === "radio") {
        element.checked = values.includes(element.value);
      } else {
        element.value = values[0] ?? "";
      }
      continue;
    }

    if (element instanceof HTMLSelectElement && element.multiple) {
      for (const option of Array.from(element.options)) {
        option.selected = values.includes(option.value);
      }
    } else {
      element.value = values[0] ?? "";
    }
  }

  form.dispatchEvent(new Event("input", { bubbles: true }));
  form.dispatchEvent(new Event("change", { bubbles: true }));
}

export function AdminFormDraftPersistence({
  formId,
  storageKey,
  restore,
  focusFieldId
}: {
  formId: string;
  storageKey: string;
  restore: boolean;
  focusFieldId?: string;
}) {
  useEffect(() => {
    const form = document.getElementById(formId);

    if (!(form instanceof HTMLFormElement)) return;

    if (restore) {
      restoreDraft(form, readDraft(storageKey));

      if (focusFieldId) {
        requestAnimationFrame(() => document.getElementById(focusFieldId)?.focus());
      }
    } else {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // Session storage can be unavailable in hardened/private browser contexts.
      }
    }

    const handleSubmit = () => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(storableFormData(form)));
      } catch {
        // A failed draft write must never block a real form submission.
      }
    };

    form.addEventListener("submit", handleSubmit);

    return () => form.removeEventListener("submit", handleSubmit);
  }, [focusFieldId, formId, restore, storageKey]);

  return null;
}
