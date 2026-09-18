export type AdminListDirection = "asc" | "desc";

export type AdminListQuery = {
  q: string;
  page: number;
  pageSize: number;
  sort?: string;
  dir: AdminListDirection;
};

export type AdminPaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseAdminListQuery(
  params: SearchParamsRecord | undefined,
  options: {
    defaultSort?: string;
    defaultDir?: AdminListDirection;
    allowedSorts?: readonly string[];
    defaultPageSize?: number;
    maxPageSize?: number;
  } = {}
): AdminListQuery {
  const defaultPageSize = options.defaultPageSize ?? 25;
  const maxPageSize = options.maxPageSize ?? 100;
  const pageSize = Math.min(maxPageSize, positiveInteger(firstValue(params?.pageSize), defaultPageSize));
  const sortCandidate = firstValue(params?.sort);
  const sort = sortCandidate && options.allowedSorts?.includes(sortCandidate) ? sortCandidate : options.defaultSort;
  const dirCandidate = firstValue(params?.dir);

  return {
    q: String(firstValue(params?.q) ?? "").trim().slice(0, 120),
    page: positiveInteger(firstValue(params?.page), 1),
    pageSize,
    sort,
    dir: dirCandidate === "desc" || dirCandidate === "asc" ? dirCandidate : options.defaultDir ?? "asc"
  };
}

export function adminPaginationMeta(totalItems: number, query: AdminListQuery): AdminPaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
  const page = Math.min(query.page, totalPages);

  return {
    page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages
  };
}

export function adminListOffset(query: AdminListQuery, totalItems?: number) {
  const totalPages = typeof totalItems === "number" ? Math.max(1, Math.ceil(totalItems / query.pageSize)) : query.page;
  const page = Math.min(query.page, totalPages);

  return (page - 1) * query.pageSize;
}
