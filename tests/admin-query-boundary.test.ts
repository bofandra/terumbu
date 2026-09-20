import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const adminRoot = join(process.cwd(), "src", "app", "admin");
const legacyAdminAggregators = ["getAdminPortalData", "getAdminOperationsData"];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return sourceFiles(path);
    }

    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

test("admin routes use page-specific queries instead of legacy aggregate loaders", () => {
  const violations = sourceFiles(adminRoot).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return legacyAdminAggregators
      .filter((name) => source.includes(name))
      .map((name) => `${relative(process.cwd(), file)} imports or references ${name}`);
  });

  assert.deepEqual(violations, []);
});
