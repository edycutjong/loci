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

test("the result showed before the walk was stored, so leaving at once could lose the score: the walk is stored first", async ({ page }) => {
  // Records, inside the page, when the IndexedDB write that holds the finished walk completes and when the result
  // first appears. A full reload or a closed tab aborts a write that hasn't completed, so the order must be fixed.
  await page.addInitScript(() => {
    const log = { walkStored: null as number | null, resultShown: null as number | null };
    (window as unknown as { __order: typeof log }).__order = log;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      const request = put.call(this, value, key);
      const walks = (value as { walks?: unknown[] } | null)?.walks;
      if (typeof key === "string" && key.startsWith("palace:") && Array.isArray(walks) && walks.length > 0) {
        this.transaction.addEventListener("complete", () => (log.walkStored ??= performance.now()));
      }
      return request;
    };
    new MutationObserver(() => {
      if (log.resultShown === null && document.querySelector(".result-title")) log.resultShown = performance.now();
    }).observe(document, { childList: true, subtree: true });
  });

  await openExample(page);
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  for (const item of NERVES) await typeAnswer(page, item);
  await expect(page.locator(".result-title")).toHaveText("You remembered all 12 on the first try.");
  const order = await page.evaluate(() => (window as unknown as { __order: { walkStored: number | null; resultShown: number | null } }).__order);
  expect(order.walkStored, "the walk was written to IndexedDB").not.toBeNull();
  expect(order.walkStored!).toBeLessThanOrEqual(order.resultShown!);

  // And it is there after leaving straight away.
  await page.reload();
  await page.goto("/");
  await expect(page.locator(".palace-row").filter({ hasText: "12 cranial nerves" }).locator(".palace-meta")).toContainText("12/12 first try");
});

test.describe("on a phone with a fractional pixel ratio", () => {
  test.use({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });

  test("a thin lit sliver showed at the photo's edge in recall: the night overhangs the photo and one edge clips both", async ({ page }) => {
    await openExample(page);
    await page.getByRole("button", { name: "Recall, lights out" }).click();
    await expect(page.locator(".palace .stage")).toHaveAttribute("data-mode", "recall");

    // Both boxes in one synchronous read: the camera may still be gliding out of Learn's zoom, and photo and night
    // move together inside it, so they must be measured in the same frame.
    const { photo, night, overflow } = await page.locator(".palace .camera").evaluate((camera) => {
      const box = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      };
      return {
        photo: box(camera.querySelector(":scope > img")!),
        night: box(camera.querySelector("rect.night")!),
        overflow: [getComputedStyle(camera).overflow, getComputedStyle(camera.querySelector("svg")!).overflow],
      };
    });
    expect(night.left).toBeLessThan(photo.left);
    expect(night.top).toBeLessThan(photo.top);
    expect(night.right).toBeGreaterThan(photo.right);
    expect(night.bottom).toBeGreaterThan(photo.bottom);
    expect(overflow).toEqual(["hidden", "visible"]);
  });
});

test("the zoomed room looked soft because will-change kept the photo painted at its unzoomed size: the camera never sets it", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: /^Next stop/ }).click();
  await expect(page.locator(".palace .stage")).toHaveAttribute("data-focused", "true");
  expect(await page.locator(".palace .camera").evaluate((camera) => getComputedStyle(camera).willChange)).toBe("auto");
});
