import { expect, test } from "@playwright/test";

// Hands-on exploration with real AI calls (LIVE=1). Screenshots go to SHOTS_DIR for a person to look at.
const SHOTS = process.env.SHOTS_DIR ?? "test-results/shots";
const ELEMENTS = ["Hydrogen", "Helium", "Lithium", "Beryllium", "Boron", "Carbon", "Nitrogen", "Oxygen", "Fluorine", "Neon", "Sodium", "Magnesium"];

test("hands-on: studio flat + first 12 elements, typed recall with typos, a skip and a retry", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: `${SHOTS}/01-home.png`, fullPage: true });

  // Awkward input first: a 5-word item is flagged and Build stays off.
  await page.getByLabel("Your list").fill("Hydrogen\nHelium\nthe quick brown fox jumps");
  await expect(page.locator(".list-long")).toContainText("Line 3");
  await expect(page.getByRole("button", { name: "Build my palace" })).toBeDisabled();
  await page.screenshot({ path: `${SHOTS}/02-long-item.png`, fullPage: true });

  // The real list, pasted with numbering and one accepted answer.
  await page.getByLabel("Your list").fill(ELEMENTS.map((e, i) => `${i + 1}. ${e}${e === "Sodium" ? " / Na" : ""}`).join("\n"));
  await page.getByTestId("photo-input").setInputFiles("public/rooms/studio.jpg");
  await expect(page.locator("#build-why")).toHaveText("12 items, ready.");
  await page.getByRole("button", { name: "Build my palace" }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/03-finding.png` });

  await expect(page.locator("#scene-item")).toHaveText("Hydrogen", { timeout: 120_000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/04-learn-1.png` });
  for (let i = 1; i < 12; i++) {
    await page.getByRole("button", { name: /^Next stop/ }).click();
    if (i === 7) {
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${SHOTS}/05-learn-8.png` });
    }
  }
  await page.getByRole("button", { name: /Lights out: start recall/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/06-lights-out.png` });

  const answers = ["hydrogen", "Helium", "lithium", "Berylium", "boron", "carbon", "nitrogen", "oxygen", "Floride", "neon", "Na", "magnesium"];
  for (let i = 0; i < 12; i++) {
    if (i === 5) {
      await page.getByRole("button", { name: "I don't know, skip" }).click();
      continue;
    }
    const box = page.getByPlaceholder("Type it");
    await box.fill(answers[i]);
    await box.press("Enter");
    if (i === 8) {
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${SHOTS}/07-recall-miss.png` });
    }
  }
  await expect(page.locator(".result-title")).toHaveText("You remembered 10 of 12 on the first try.");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/08-result.png`, fullPage: true });

  await page.getByRole("button", { name: "Look at their scenes again" }).click();
  await expect(page.locator("#scene-item")).toHaveText("Carbon");
  await page.screenshot({ path: `${SHOTS}/09-relearn.png` });
  await page.getByRole("button", { name: /^Next stop/ }).click();
  await expect(page.locator("#scene-item")).toHaveText("Fluorine");
  await page.getByRole("button", { name: "Retry these 2 stops" }).click();
  for (const a of ["carbon", "fluorine"]) {
    const box = page.getByPlaceholder("Type it");
    await box.fill(a);
    await box.press("Enter");
  }
  await expect(page.locator(".result-retry")).toHaveText("After retrying: 12 of 12.");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/10-all-lit.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/11-all-lit-desktop.png` });
});
