import { expect, test } from "@playwright/test";

test.describe("public bilingual discovery SEO", () => {
  for (const locale of ["en", "id"] as const) {
    test(`${locale} landing pages render at stable crawlable URLs`, async ({ page }) => {
      for (const path of [`/${locale}`, `/${locale}/expeditions`, `/${locale}/impact-map`]) {
        const response = await page.goto(path);
        expect(response?.status(), path).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("h1").first()).toBeVisible();
        const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
        expect(canonical, path).toContain(path);
        await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
        await expect(page.locator('link[rel="alternate"][hreflang="id"]')).toHaveCount(1);
      }
    });
  }

  test("international guest searches without losing the English URL prefix", async ({ page }) => {
    await page.goto("/en");
    const form = page.locator('form[action="/en/expeditions"]').first();
    await expect(form).toBeVisible();
    await form.locator('input[name="participants"]').fill("2");
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/en\/expeditions\?[^#]*participants=2/);
  });
});
