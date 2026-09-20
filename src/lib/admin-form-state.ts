export type AdminFormOutcome = "error" | "saved";

type SearchValue = string | string[] | undefined;

const fieldNamePattern = /^[A-Za-z][A-Za-z0-9_-]{0,79}$/;

function normalizedFieldNames(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => fieldNamePattern.test(value)))];
}

export function adminFormFieldNames(value: SearchValue) {
  if (!value) return [];

  return normalizedFieldNames(Array.isArray(value) ? value : [value]);
}

export function withAdminFormOutcome(
  path: string,
  outcome: AdminFormOutcome,
  code: string,
  fields: readonly string[] = []
) {
  const baseUrl = "https://terumbu.local";
  const url = new URL(path, baseUrl);

  if (url.origin !== baseUrl || !url.pathname.startsWith("/admin/")) {
    throw new Error("Admin form outcome paths must stay within /admin/.");
  }

  url.searchParams.set(outcome, code);
  url.searchParams.delete("field");

  for (const field of normalizedFieldNames(fields)) {
    url.searchParams.append("field", field);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
