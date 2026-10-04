import { expect, test } from "@playwright/test";

// Final hands-on pass on a running site (LIVE=1, BASE_URL = the deployed app). Screenshots go to SHOTS_DIR.
const SHOTS = process.env.SHOTS_DIR ?? "test-results/shots";
const NERVES = ["Olfactory", "Optic", "Oculomotor", "Trochlear", "Trigeminal", "Abducens", "Facial", "Vestibulocochlear", "Glossopharyngeal", "Vagus", "Accessory", "Hypoglossal"];

test("keyboard only: example palace, learn, recall, retry, all lit", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: `${SHOTS}/f01-home-phone.png` });
  await page.keyboard.press("Tab"); // wordmark
  await page.keyboard.press("Tab"); // Try it
  await expect(page.getByRole("button", { name: "Try it: 12 cranial nerves" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#scene-item")).toHaveText("Olfactory");
  for (let i = 0; i < 11; i++) await page.keyboard.press("ArrowRight");
  await expect(page.locator("#scene-item")).toHaveText("Hypoglossal");
  await page.getByRole("button", { name: /Lights out: start recall/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByPlaceholder("Type it")).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.type(i === 9 ? "Vegas" : NERVES[i].toLowerCase());
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".result-title")).toHaveText("You remembered 11 of 12 on the first try.");
  await page.getByRole("button", { name: "Retry the missed stop" }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.type("vagus");
  await page.keyboard.press("Enter");
  await expect(page.locator(".result-retry")).toHaveText("After retrying: 12 of 12.");
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${SHOTS}/f02-all-lit-phone.png` });
});

test("awkward inputs on Home: too many items, a long item, tiny items, accepted answers", async ({ page }) => {
  await page.goto("/");
  const box = page.getByLabel("Your list");
  await page.getByRole("button", { name: /Kitchen/ }).click();
  await box.fill(Array.from({ length: 13 }, (_, i) => `thing ${i + 1}`).join("\n"));
  await expect(page.locator("#build-why")).toHaveText("Keep it to 12 items (you have 13).");
  await box.fill("salt\nthe big blue ceramic bowl\npepper");
  await expect(page.locator(".list-long")).toContainText("Line 2");
  await expect(page.getByRole("button", { name: "Build my palace" })).toBeDisabled();
  await box.fill("C\nNe\nSodium / Na\nO");
  await expect(page.locator("#build-why")).toHaveText("4 items, ready.");
  await page.getByRole("button", { name: "Build my palace" }).click();
  await expect(page.locator("#scene-item")).toHaveText("C", { timeout: 90_000 });
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  for (const a of ["c", "ne", "na", "0"]) {
    await page.getByPlaceholder("Type it").fill(a);
    await page.getByPlaceholder("Type it").press("Enter");
  }
  // "0" is not "O": one-letter items need an exact match.
  await expect(page.locator(".result-title")).toHaveText("You remembered 3 of 4 on the first try.");
  await page.screenshot({ path: `${SHOTS}/f03-tiny-items.png` });
});

test("reload mid-recall starts recall fresh; the palace stays; delete removes it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try it: 12 cranial nerves" }).click();
  await expect(page.locator("#scene-item")).toHaveText("Olfactory");
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  await page.getByPlaceholder("Type it").fill("olfactory");
  await page.getByPlaceholder("Type it").press("Enter");
  await page.reload();
  await expect(page.locator("#scene-item")).toHaveText("Olfactory"); // back in Learn; the half walk is not kept
  await page.getByRole("button", { name: "Back to your palaces" }).click();
  const row = page.locator(".palace-row").filter({ hasText: "12 cranial nerves" });
  await expect(row).toContainText("Not walked yet");
  await page.screenshot({ path: `${SHOTS}/f04-saved.png`, fullPage: false });
  await row.getByRole("button", { name: /Delete the palace/ }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator(".palace-row")).toHaveCount(0);
});

test("laptop: own photo through the real AI, learn and recall", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SHOTS}/f05-home-laptop.png` });
  await page.getByTestId("photo-input").setInputFiles("public/rooms/kitchen.jpg");
  await page.getByLabel("Your list").fill("Saffron\nCapers\nYuzu\nMiso\nTahini\nSumac");
  await page.getByRole("button", { name: "Build my palace" }).click();
  await expect(page.locator("#scene-item")).toHaveText("Saffron", { timeout: 120_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/f06-learn-laptop.png` });
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  for (const a of ["saffron", "capers", "yuzu", "miso", "tahini", "sumac"]) {
    await page.getByPlaceholder("Type it").fill(a);
    await page.getByPlaceholder("Type it").press("Enter");
  }
  await expect(page.locator(".result-title")).toHaveText("You remembered all 6 on the first try.");
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${SHOTS}/f07-all-lit-laptop.png` });
});
