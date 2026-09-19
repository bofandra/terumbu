import assert from "node:assert/strict";
import test from "node:test";

import { adminListOffset, adminPaginationMeta, parseAdminListQuery } from "../src/lib/admin-list-query";

test("admin list query trims search text and normalizes paging", () => {
  assert.deepEqual(parseAdminListQuery({ q: "  mangrove  ", page: "2", pageSize: "50" }), {
    q: "mangrove",
    page: 2,
    pageSize: 50,
    sort: undefined,
    dir: "asc"
  });

  assert.equal(parseAdminListQuery({ q: "x".repeat(200) }).q.length, 120);
  assert.equal(parseAdminListQuery({ page: "0" }).page, 1);
  assert.equal(parseAdminListQuery({ page: "oops" }).page, 1);
});

test("admin list page size is bounded", () => {
  assert.equal(parseAdminListQuery({ pageSize: "250" }).pageSize, 100);
  assert.equal(parseAdminListQuery({ pageSize: "0" }, { defaultPageSize: 20 }).pageSize, 20);
  assert.equal(parseAdminListQuery({ pageSize: "50" }, { maxPageSize: 40 }).pageSize, 40);
});

test("admin list sort is restricted to the allowlist", () => {
  const allowedSorts = ["name", "createdAt"] as const;

  assert.equal(parseAdminListQuery({ sort: "name" }, { allowedSorts, defaultSort: "createdAt" }).sort, "name");
  assert.equal(parseAdminListQuery({ sort: "DROP TABLE" }, { allowedSorts, defaultSort: "createdAt" }).sort, "createdAt");
  assert.equal(parseAdminListQuery({ dir: "desc" }).dir, "desc");
  assert.equal(parseAdminListQuery({ dir: "sideways" }, { defaultDir: "asc" }).dir, "asc");
});

test("admin pagination metadata clamps an out-of-range page", () => {
  const query = parseAdminListQuery({ page: "99", pageSize: "25" });

  assert.deepEqual(adminPaginationMeta(62, query), {
    page: 3,
    pageSize: 25,
    totalItems: 62,
    totalPages: 3,
    hasPrevious: true,
    hasNext: false
  });

  assert.equal(adminListOffset(query, 62), 50);
});

test("admin pagination handles an empty result set", () => {
  const query = parseAdminListQuery({ page: "4", pageSize: "25" });

  assert.deepEqual(adminPaginationMeta(0, query), {
    page: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false
  });

  assert.equal(adminListOffset(query, 0), 0);
});
