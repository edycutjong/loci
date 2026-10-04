import { expect, test } from "@playwright/test";
import { stubAi } from "./helpers";

const SHOTS = process.env.SHOTS_DIR ?? "test-results/shots";

test("an example room with an example list opens in under 2 seconds with no AI calls", async ({ page }) => {
  const calls = await stubAi(page);
  await page.goto("/");
  await page.screenshot({ path: `${SHOTS}/home-hero.png` });
  await page.getByRole("button", { name: /Student room/ }).click();
  await page.getByRole("button", { name: "12 cranial nerves", exact: true }).click();
  const started = Date.now();
  await page.getByRole("button", { name: "Build my palace" }).click();
  await expect(page.locator("#scene-item")).toHaveText("Olfactory");
  expect(Date.now() - started).toBeLessThan(2000);
  expect(calls).toEqual({ anchors: 0, scenes: 0 });
  await expect(page.locator(".made-note")).toContainText("prepared in advance");
  await expect(page.locator(".topbar-title")).toHaveText("12 cranial nerves");
});

test("the hero's one-tap example opens straight into learning", async ({ page }) => {
  const calls = await stubAi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Try it: 12 cranial nerves" }).click();
  await expect(page.locator("#scene-item")).toHaveText("Olfactory");
  await expect(page.locator(".palace .pin")).toHaveCount(12);
  expect(calls).toEqual({ anchors: 0, scenes: 0 });
});

test("an example room with your own list only asks for scenes", async ({ page }) => {
  const calls = await stubAi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Kitchen/ }).click();
  await page.getByRole("button", { name: "Grocery run" }).click();
  await page.getByLabel("Your list").fill("Saffron\nCapers\nYuzu\nMiso\nTahini");
  await page.getByRole("button", { name: "Build my palace" }).click();
  await expect(page.locator("#scene-item")).toHaveText("Saffron");
  expect(calls).toEqual({ anchors: 0, scenes: 1 });
  await expect(page.locator(".topbar-title")).toHaveText("Saffron → Tahini");
});
