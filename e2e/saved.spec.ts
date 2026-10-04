import { expect, test } from "@playwright/test";
import { NERVES, buildOwnPalace, stubAi, typeAnswer } from "./helpers";

const SHOTS = process.env.SHOTS_DIR ?? "test-results/shots";

test("a palace and its last walk are still there after a reload, and can be deleted", async ({ page }) => {
  await stubAi(page);
  await buildOwnPalace(page, NERVES.slice(0, 4));
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  for (const answer of ["olfactory", "optic", "nope", "trochlear"]) await typeAnswer(page, answer);
  await expect(page.locator(".result-title")).toHaveText("You remembered 3 of 4 on the first try.");
  const palaceUrl = page.url();

  // Close and come back: the palace is on Home with its result.
  await page.goto("/");
  await page.reload();
  const row = page.locator(".palace-row").filter({ hasText: "Olfactory → Trochlear" });
  await expect(row).toBeVisible();
  await expect(row.locator(".palace-meta")).toContainText("4 stops · 3/4 first try");
  await expect(row.locator('.mini-strip i[data-ok="false"]')).toHaveCount(1);
  await page.screenshot({ path: `${SHOTS}/saved-home.png`, fullPage: true });

  // It opens from storage (photo included) straight into Learn.
  await row.locator(".palace-open").click();
  await expect(page.locator("#scene-item")).toHaveText("Olfactory");
  await expect(page.locator(".palace .camera img")).toHaveAttribute("src", /^blob:/);

  // A direct link opens it too, after a full reload.
  await page.goto(palaceUrl);
  await page.reload();
  await expect(page.locator("#scene-item")).toHaveText("Olfactory");

  // Delete asks first, then it's gone, also after a reload.
  await page.goto("/");
  await page.getByRole("button", { name: /Delete the palace Olfactory → Trochlear/ }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(".palace-row")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".palace-row")).toHaveCount(0);
  await page.goto(palaceUrl);
  await expect(page.getByText("This palace isn't on this device.")).toBeVisible();
});
