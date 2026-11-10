import { expect, test } from "@playwright/test";

test("localized public URLs have correct language and indexable alternate metadata", async ({ page }) => {
  for (const { path, lang } of [
    { path: "/id", lang: "id" },
    { path: "/en", lang: "en" },
    { path: "/id/impact-map", lang: "id" },
    { path: "/en/expeditions", lang: "en" }
  ]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/${lang}(?:/|$)`));
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en(?:\/|$)/);
    await expect(page.locator('link[rel="alternate"][hreflang="id"]')).toHaveAttribute("href", /\/id(?:\/|$)/);
  }
});

test("homepage, expedition catalogue and impact map stay usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, filename] of [
    ["/en", "homepage"],
    ["/en/expeditions", "expeditions"],
    ["/en/impact-map", "impact-map"]
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Toggle menu" })).toBeVisible();
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(horizontalOverflow, `Horizontal overflow at ${path}`).toBeLessThanOrEqual(2);
    await page.screenshot({ path: `test-results/public-qa/${filename}-mobile.png`, fullPage: true, animations: "disabled" });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/impact-map");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.screenshot({ path: "test-results/public-qa/impact-map-desktop.png", fullPage: true, animations: "disabled" });
});
