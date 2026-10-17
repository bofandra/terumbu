import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const code = (path: string) => readFileSync(path, "utf8");

test("public URL fallbacks use the .world production domain", () => {
  const files = [
  "src/app/robots.ts",
  "deploy/Dockerfile",
  "src/app/layout.tsx",
  "src/app/sitemap.ts",
  "src/lib/auth-tokens.ts",
  "src/lib/academy-transcript.ts",
  "src/lib/certificate-verification.ts",
  "src/lib/donation-receipt.ts",
  "src/app/dashboard/reports/[reportId]/download/route.ts",
  "src/lib/passport-sharing.ts",
  "src/app/(public)/certificates/verify/[publicSlug]/download/route.ts",
  "src/lib/monthly-impact-report.ts",
  "src/app/dashboard/page.tsx",
  "src/app/(public)/partners/[slug]/page.tsx",
  "src/app/dashboard/impact/page.tsx",
  "src/app/(public)/academy/page.tsx",
  "src/app/(public)/destinations/[slug]/page.tsx",
  "src/app/(public)/campaigns/[slug]/page.tsx",
  "src/app/(public)/expeditions/[slug]/page.tsx",
  "src/app/(public)/passport/[publicSlug]/page.tsx",
  "src/app/(public)/academy/courses/[slug]/page.tsx",
  "src/app/(public)/certificates/verify/[publicSlug]/page.tsx"
];
  for (const path of files) {
    assert.equal(code(path).includes("https://terumbu.eco"), false, path);
    assert.equal(code(path).includes("https://terumbu.world"), true, path);
  }
});

test("operator forms and demo seed data exclude obsolete marketplace claims", () => {
  for (const path of ["src/components/expedition-marketplace-fields.tsx", "scripts/seed.ts"]) {
    for (const term of ["Higher chance of approval", "Sustainable project", "Higher approval"]) {
      assert.equal(code(path).includes(term), false, `${path} has obsolete claim: ${term}`);
    }
  }
});

test("homepage hero image only appears when sourced from managed field updates", () => {
  const homepage = code("src/app/(public)/page.tsx");
  assert.equal(homepage.includes("images.unsplash.com"), false);
  assert.equal(homepage.includes("fieldUpdate?.imageUrl"), true);
  assert.equal(homepage.includes("{heroImageUrl ? ("), true);
});
