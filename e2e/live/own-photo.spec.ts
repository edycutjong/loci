import { expect, test } from "@playwright/test";

// Real AI calls: run with LIVE=1 BASE_URL=http://localhost:5174 (or the deployed site).
const SHOTS = process.env.SHOTS_DIR ?? "test-results/shots";
const NERVES = ["Olfactory", "Optic", "Oculomotor", "Trochlear", "Trigeminal", "Abducens", "Facial", "Vestibulocochlear", "Glossopharyngeal", "Vagus", "Accessory", "Hypoglossal"];

test("your own photo and a 12-item list become 12 pins along one route", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("photo-input").setInputFiles("public/rooms/kos.jpg");
  await page.getByLabel("Your list").fill(NERVES.join("\n"));
  await page.getByRole("button", { name: "Build my palace" }).click();

  await expect(page.locator(".pin")).toHaveCount(12, { timeout: 90_000 });
  await expect(page.locator(".seg.track")).toHaveCount(11);
  await page.waitForTimeout(1200); // let the pins finish dropping in

  const stage = (await page.locator(".stage").boundingBox())!;
  for (const pin of await page.locator(".pin").all()) {
    const b = (await pin.boundingBox())!;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    expect(cx).toBeGreaterThanOrEqual(stage.x);
    expect(cx).toBeLessThanOrEqual(stage.x + stage.width);
    expect(cy).toBeGreaterThanOrEqual(stage.y);
    expect(cy).toBeLessThanOrEqual(stage.y + stage.height);
  }
  // The route starts at the leftmost stop and ends at the rightmost.
  const xs = await page.locator(".pin").evaluateAll((pins) => pins.map((p) => p.getBoundingClientRect().left));
  expect(xs[0]).toBe(Math.min(...xs));
  expect(xs[xs.length - 1]).toBe(Math.max(...xs));
  await page.screenshot({ path: `${SHOTS}/own-photo-route.png` });
});
