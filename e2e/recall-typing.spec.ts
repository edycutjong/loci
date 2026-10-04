import { expect, test } from "@playwright/test";
import { NERVES, buildOwnPalace, stubAi, typeAnswer } from "./helpers";

const SHOTS = process.env.SHOTS_DIR ?? "test-results/shots";

test("typed recall: 11 right and 1 wrong, then retrying the miss lights the whole room", async ({ page }) => {
  await stubAi(page);
  await buildOwnPalace(page);
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  await expect(page.locator(".palace .stage")).toHaveAttribute("data-mode", "recall");

  for (let i = 0; i < NERVES.length; i++) {
    await expect(page.locator("#recall-place")).toBeVisible();
    await typeAnswer(page, i === 4 ? "Optic" : NERVES[i]); // stop 5 answered with another item: wrong
    if (i === 6) await page.screenshot({ path: `${SHOTS}/recall-lights-out.png` });
  }

  await expect(page.locator(".result-title")).toHaveText("You remembered 11 of 12 on the first try.");
  await expect(page.locator('.palace .pin[data-state="right"]')).toHaveCount(11);
  await expect(page.locator('.palace .pin[data-state="wrong"]')).toHaveCount(1);
  await expect(page.locator(".palace .stage")).toHaveAttribute("data-all-lit", "false");
  await expect(page.locator(".result-line")).toContainText("first try 11/12");

  await page.getByRole("button", { name: "Retry the missed stop" }).click();
  await expect(page.locator(".scene-count")).toContainText("retry 1 of 1");
  await typeAnswer(page, "trigeminel"); // one typo in a 10-letter word still counts
  await expect(page.locator(".result-title")).toHaveText("You remembered 11 of 12 on the first try.");
  await expect(page.locator(".result-retry")).toHaveText("After retrying: 12 of 12.");
  await expect(page.locator(".result-lit")).toHaveText(/Every light is on/);
  await expect(page.locator('.palace .pin[data-state="right"]')).toHaveCount(12);
  await expect(page.locator(".palace .stage")).toHaveAttribute("data-all-lit", "true");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/recall-all-lit.png` });
});

test("skipping counts as a miss, and the right answer is never shown after a miss", async ({ page }) => {
  await stubAi(page);
  await buildOwnPalace(page, NERVES.slice(0, 3));
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  await page.getByRole("button", { name: "I don't know, skip" }).click();
  await expect(page.locator(".feedback")).toHaveText("Stop 1: skipped.");
  await typeAnswer(page, "Trochlear"); // wrong for stop 2
  await expect(page.locator(".feedback")).toHaveText("Stop 2: not this one.");
  await expect(page.locator(".feedback")).not.toContainText("Optic");
  await typeAnswer(page, "oculomotor");
  await expect(page.locator(".result-title")).toHaveText("You remembered 1 of 3 on the first try.");
  await expect(page.getByRole("button", { name: "Retry the 2 missed stops" })).toBeVisible();
  // From the result, Walk it again starts a fresh walk.
  await page.getByRole("button", { name: "Walk it again" }).click();
  await expect(page.locator(".recall .scene-count")).toHaveText(" · stop 1 of 3");
});
