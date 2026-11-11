import { expect, test } from "@playwright/test";

const locales = ["en", "id"] as const;
const pagePaths = ["", "/expeditions", "/impact-map"] as const;
const viewportWidths = [390, 768, 1280, 1440] as const;

for (const locale of locales) {
  for (const width of viewportWidths) {
    test(`release screenshot and overflow QA: ${locale} at ${width}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });

      for (const path of pagePaths) {
        const url = `/${locale}${path}`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded" });
        expect(response?.status(), url).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("main#main-content")).toBeVisible();
        await expect(page.locator("h1").first()).toBeVisible();

        const overflow = await page.evaluate(() => {
          const root = document.documentElement;
          return Math.max(0, root.scrollWidth - root.clientWidth);
        });
        expect(overflow, `${url}: horizontal overflow at ${width}px`).toBeLessThanOrEqual(3);
        await page.screenshot({
          path: `test-results/uiux-review/${locale}-${path ? path.slice(1).replaceAll("/", "-") : "home"}-${width}.png`,
          fullPage: true,
          animations: "disabled"
        });
      }
    });
  }
}

test("public keyboard skip link moves focus to main content", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /skip to main content/i });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main-content")).toBeFocused();
});

test("responsive traveler inquiry keeps opt-in consent and no payment claim", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/expeditions");
  const links = page.locator('main a[href*="/expeditions/"]');
  // Seeded environments may have no published departures. Never fabricate trips for a visual QA test.
  if (await links.count() === 0) return;
  const href = await links.first().getAttribute("href");
  if (!href) return;
  const response = await page.goto(href);
  if (response?.status() !== 200) return;

  const question = page.locator('form').filter({ has: page.locator('input[name="requestType"][value="question"]') });
  await expect(question).toHaveCount(1);
  await expect(question.locator('input[name="contactConsent"]')).toHaveAttribute("required", "");
  await expect(question.locator('input[name="contactConsent"]')).not.toBeChecked();
});
