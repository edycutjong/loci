import { expect, test } from "@playwright/test";

// Real AI calls: run with LIVE=1 BASE_URL=http://localhost:5174 (or the deployed site).
const SHOTS = process.env.SHOTS_DIR ?? "test-results/shots";
const NERVES = ["Olfactory", "Optic", "Oculomotor", "Trochlear", "Trigeminal", "Abducens", "Facial", "Vestibulocochlear", "Glossopharyngeal", "Vagus", "Accessory", "Hypoglossal"];

test("learn walks all 12 stops with a scene each, by button and by arrow key", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("photo-input").setInputFiles("public/rooms/kos.jpg");
  await page.getByLabel("Your list").fill(NERVES.join("\n"));
  await page.getByRole("button", { name: "Build my palace" }).click();

  const item = page.locator("#scene-item");
  await expect(item).toHaveText(NERVES[0], { timeout: 120_000 });
  await page.waitForTimeout(900); // camera glide
  await page.screenshot({ path: `${SHOTS}/learn-stop-01.png` });

  for (let i = 0; i < NERVES.length; i++) {
    await expect(item).toHaveText(NERVES[i]);
    await expect(page.locator(".scene-where")).toContainText(`stop ${i + 1} of 12`);
    const where = (await page.locator(".scene-where").innerText()).trim();
    expect(where).toMatch(/^on the \S/);
    const scene = (await page.locator(".scene-text").innerText()).trim();
    expect(scene.length).toBeGreaterThan(20);
    if (i === 5) {
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${SHOTS}/learn-stop-06.png` });
    }
    if (i < NERVES.length - 1) await page.getByRole("button", { name: /^Next stop/ }).click();
  }
  await expect(page.getByRole("button", { name: /start recall/i })).toBeVisible();

  // Arrow keys walk back and forth too.
  await page.keyboard.press("ArrowLeft");
  await expect(item).toHaveText(NERVES[10]);
  await page.keyboard.press("ArrowRight");
  await expect(item).toHaveText(NERVES[11]);
  // The line strip jumps to any stop; in the whole-room view any pin can be tapped.
  await page.locator(".strip button").nth(2).click();
  await expect(item).toHaveText(NERVES[2]);
  await page.getByRole("button", { name: "See the whole room" }).click();
  await page.locator(".palace .pin").nth(8).click();
  await expect(item).toHaveText(NERVES[8]);
});
