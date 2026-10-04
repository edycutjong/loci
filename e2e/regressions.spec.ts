import { expect, test, type Page } from "@playwright/test";
import { NERVES, stubAi, typeAnswer } from "./helpers";

// Browser regressions, one per real defect found while building Loci (devpost/checklist.md, git log).
// Each name says what went wrong; the body pins the fix. The unit-level ones are in tests/regressions.test.ts.

async function openExample(page: Page) {
  await stubAi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Try it: 12 cranial nerves" }).click();
  await page.locator("#scene-item").waitFor();
}

test("the Recall tab did nothing on the result screen: from the result, every way back into the dark starts a fresh walk", async ({ page }) => {
  await openExample(page);
  const freshWalk = async () => {
    await expect(page.locator(".recall .scene-count")).toHaveText(" · stop 1 of 12");
    await expect(page.locator('.palace .pin[data-state="right"]')).toHaveCount(0);
  };

  await page.getByRole("button", { name: "Recall, lights out" }).click();
  for (const item of NERVES) await typeAnswer(page, item);
  await expect(page.locator(".result-title")).toHaveText("You remembered all 12 on the first try.");
  await page.getByRole("button", { name: "Walk it again" }).click();
  await freshWalk();

  for (const item of NERVES) await typeAnswer(page, item);
  await expect(page.locator(".result-title")).toBeVisible();
  await page.getByRole("button", { name: "Back to learning" }).click();
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  await freshWalk();
});

test.describe("on a phone with a fractional pixel ratio", () => {
  test.use({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });

  test("a thin lit sliver showed at the photo's edge in recall: the night overhangs the photo and one edge clips both", async ({ page }) => {
    await openExample(page);
    await page.getByRole("button", { name: "Recall, lights out" }).click();
    await expect(page.locator(".palace .stage")).toHaveAttribute("data-mode", "recall");

    const photo = (await page.locator(".palace .camera > img").boundingBox())!;
    const night = (await page.locator(".palace .camera rect.night").boundingBox())!;
    expect(night.x).toBeLessThan(photo.x);
    expect(night.y).toBeLessThan(photo.y);
    expect(night.x + night.width).toBeGreaterThan(photo.x + photo.width);
    expect(night.y + night.height).toBeGreaterThan(photo.y + photo.height);
    const overflow = await page.locator(".palace .camera").evaluate((camera) => [getComputedStyle(camera).overflow, getComputedStyle(camera.querySelector("svg")!).overflow]);
    expect(overflow).toEqual(["hidden", "visible"]);
  });
});

test("the zoomed room looked soft because will-change kept the photo painted at its unzoomed size: the camera never sets it", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: /^Next stop/ }).click();
  await expect(page.locator(".palace .stage")).toHaveAttribute("data-focused", "true");
  expect(await page.locator(".palace .camera").evaluate((camera) => getComputedStyle(camera).willChange)).toBe("auto");
});
