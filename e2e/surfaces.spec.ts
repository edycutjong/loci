import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// The static pages around the app: the story page (/story/), the pitch deck (/deck/) and the 404 page.
// Like Vercel, the preview server redirects /story and /deck to their trailing-slash URLs and answers unknown
// addresses with 404.html (vite.config.ts → staticPages).
const VERSION = `v${JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version}`;

/** Records every console error and every request that fails or answers 400+ (the page's own URL aside). */
function watch(page: Page) {
  const problems: string[] = [];
  const pages = new Set<string>(); // the documents themselves: a 404 page is allowed its own 404
  page.on("request", (r) => {
    if (r.isNavigationRequest()) pages.add(r.url());
  });
  page.on("console", (m) => {
    if (m.type() === "error" && !pages.has(m.location().url)) problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.request().isNavigationRequest()) problems.push(`${r.status()} ${r.url()}`);
  });
  page.on("requestfailed", (r) => {
    // A video's first full request is cancelled once the browser switches to range requests; that is not a miss.
    if (r.resourceType() !== "media") problems.push(`failed ${r.url()} ${r.failure()?.errorText}`);
  });
  return problems;
}

test("the story page: /story redirects to /story/, shows the example palace, and every file on it loads", async ({ page }) => {
  const redirect = await page.request.get("/story", { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers()["location"]).toBe("/story/");

  const problems = watch(page);
  await page.goto("/story/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Say your list in the dark. Your room lights up.");
  await expect(page.locator("#hero-stage .pin")).toHaveCount(12);
  await expect(page.locator(".strip li")).toHaveCount(12);
  await expect(page.locator(".scenes li")).toHaveCount(12);
  await expect(page.locator(".foot .ver")).toHaveText(VERSION);
  await expect(page.getByRole("link", { name: "Open Loci" }).first()).toHaveAttribute("href", "../");

  for (const y of [1500, 3500, 6000, 9000, 20000]) {
    await page.mouse.wheel(0, y);
    await page.waitForTimeout(150);
  }
  await page.waitForLoadState("networkidle");
  const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
  expect(broken).toEqual([]);
  expect(problems).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test.describe("the pitch deck", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("/deck redirects to /deck/; the keys walk 10 slides; the stage fits a phone either way up", async ({ page }) => {
    const redirect = await page.request.get("/deck", { maxRedirects: 0 });
    expect(redirect.status()).toBe(308);
    expect(redirect.headers()["location"]).toBe("/deck/");

    const problems = watch(page);
    await page.goto("/deck/");
    await expect(page.locator(".slide")).toHaveCount(10);
    await expect(page.locator("#counter")).toHaveText("01 / 10");
    await expect(page.locator(".slide.on .meta .v")).toHaveText(VERSION);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#counter")).toHaveText("02 / 10");
    await page.keyboard.press("End");
    await expect(page.locator("#counter")).toHaveText("10 / 10");
    await expect(page).toHaveURL(/#10$/);

    for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(100);
      const box = await page.locator("#stage").boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.y).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 1);
    }
    expect(problems).toEqual([]);
  });
});

test("an address that isn't a page answers 404 with Loci's own page", async ({ page }) => {
  const problems = watch(page);
  const response = await page.goto("/rooms/no/such/stop");
  expect(response!.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("That stop isn't on the route.");
  await expect(page.locator(".pin")).toHaveCount(12);
  await page.getByRole("link", { name: "The story" }).click();
  await expect(page).toHaveURL(/\/story\/$/);
  expect(problems).toEqual([]);
});
