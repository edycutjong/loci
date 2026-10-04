import { expect, test } from "@playwright/test";
import { NERVES, stubAi, typeAnswer } from "./helpers";

// Narrow phones: no state may scroll sideways (a long "Next stop: the …" label once widened the page).
for (const width of [320, 360, 390]) {
  test(`${width} px wide: no sideways scroll on home, any learn stop, any recall stop, or the result`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await stubAi(page);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.goto("/");
    expect(await overflow(), "home").toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Try it: 12 cranial nerves" }).click();
    await page.locator("#scene-item").waitFor();
    for (let i = 0; i < 11; i++) {
      expect(await overflow(), `learn stop ${i + 1}`).toBeLessThanOrEqual(0);
      await page.getByRole("button", { name: /^Next stop/ }).click();
    }
    await page.getByRole("button", { name: "Recall, lights out" }).click();
    for (let i = 0; i < 12; i++) {
      expect(await overflow(), `recall stop ${i + 1}`).toBeLessThanOrEqual(0);
      await typeAnswer(page, NERVES[i]);
    }
    await expect(page.locator(".result-title")).toBeVisible();
    expect(await overflow(), "result").toBeLessThanOrEqual(0);
  });
}
