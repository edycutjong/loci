import { expect, test } from "@playwright/test";
import { NERVES, stubAi } from "./helpers";

const SHOTS = process.env.SHOTS_DIR ?? "test-results/shots";

async function startOwnBuild(page: import("@playwright/test").Page, items = NERVES) {
  await page.goto("/");
  await page.getByTestId("photo-input").setInputFiles("public/rooms/kos.jpg");
  await page.getByLabel("Your list").fill(items.join("\n"));
  await page.getByRole("button", { name: "Build my palace" }).click();
}

test("the AI is unreachable: say so, keep the photo and list, and Try again repeats only that step", async ({ page }) => {
  const calls = await stubAi(page); // scenes as usual; objects fail once, below
  await page.unroute("**/api/anchors");
  let tries = 0;
  const kos = (await import("./fixtures/kos-anchors.json", { with: { type: "json" } })).default;
  await page.route("**/api/anchors", async (route) => {
    tries++;
    if (tries === 1) return route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Couldn't reach the AI to look at your photo." }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ anchors: kos.anchors, model: "stub", ms: 1 }) });
  });
  await startOwnBuild(page);
  await expect(page.getByRole("alert")).toContainText("Couldn't reach the AI to look at your photo.");
  await expect(page.getByRole("alert")).toContainText("Your photo and list are still here.");
  await page.screenshot({ path: `${SHOTS}/fail-ai.png` });
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("#scene-item")).toHaveText("Olfactory");
  expect(tries).toBe(2);
  expect(calls.scenes).toBe(1);
});

test("scenes fail: Try again asks only for scenes, not for the objects again", async ({ page }) => {
  const calls = { anchors: 0, scenes: 0 };
  const kos = (await import("./fixtures/kos-anchors.json", { with: { type: "json" } })).default;
  await page.route("**/api/anchors", async (route) => {
    calls.anchors++;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ anchors: kos.anchors, model: "stub", ms: 1 }) });
  });
  await page.route("**/api/scenes", async (route) => {
    calls.scenes++;
    if (calls.scenes === 1) return route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Couldn't reach the AI to write your scenes." }) });
    const { stops } = route.request().postDataJSON() as { stops: { object: string; item: string }[] };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ scenes: stops.map((s, i) => ({ stop: i + 1, scene: `Your ${s.object} hums ${s.item}.`, soundsLike: "" })), model: "stub" }) });
  });
  await startOwnBuild(page);
  await expect(page.getByRole("alert")).toContainText("Couldn't reach the AI to write your scenes.");
  await expect(page.locator(".pin")).toHaveCount(12); // the route is already on the photo
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("#scene-item")).toHaveText("Olfactory");
  expect(calls).toEqual({ anchors: 1, scenes: 2 });
});

test("too few objects: offer to shorten the list, then build with exactly that many stops", async ({ page }) => {
  // Eight well-separated objects on a 4 × 2 grid (the student room photo is portrait, 853 × 1280).
  const eight = Array.from({ length: 8 }, (_, i) => {
    const x = 120 + (i % 4) * 250;
    const y = i < 4 ? 260 : 700;
    return { label: `object ${i + 1}`, box_2d: [y - 40, x - 40, y + 40, x + 40] };
  });
  await stubAi(page, { anchors: () => ({ status: 200, body: { anchors: eight, model: "stub", ms: 1 } }) });
  await startOwnBuild(page);
  await expect(page.getByRole("alert")).toContainText("Found 8 good spots for 12 items.");
  await page.screenshot({ path: `${SHOTS}/fail-too-few.png` });
  await page.getByRole("button", { name: "Use the first 8 items" }).click();
  await expect(page.locator("#scene-item")).toHaveText("Olfactory");
  await expect(page.locator(".pin")).toHaveCount(8);
  await expect(page.locator(".topbar-title")).toHaveText("Olfactory → Vestibulocochlear");
});

test("too few objects: Try another photo goes back with the list kept", async ({ page }) => {
  await stubAi(page, { anchors: () => ({ status: 200, body: { anchors: [{ label: "lamp", box_2d: [100, 100, 300, 300] }, { label: "door", box_2d: [100, 700, 600, 900] }, { label: "rug", box_2d: [700, 300, 900, 600] }], model: "stub", ms: 1 } }) });
  await startOwnBuild(page);
  await expect(page.getByRole("alert")).toContainText("Found 3 good spots for 12 items.");
  await page.getByRole("button", { name: "Try another photo" }).click();
  await expect(page.getByLabel("Your list")).toHaveValue(NERVES.join("\n"));
});

test("a file that isn't a photo gets a plain message", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("photo-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a photo") });
  await expect(page.getByRole("alert")).toHaveText("That file isn't a photo we can open. Try a JPG or PNG.");
});

test("reduced motion: no glides, no light animations, the demo holds still on the lit room", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stubAi(page);
  await page.goto("/");
  await expect(page.locator(".hero-demo .stage")).toHaveAttribute("data-all-lit", "true");
  await page.getByRole("button", { name: "Try it: 12 cranial nerves" }).click();
  await expect(page.locator("#scene-item")).toHaveText("Olfactory");
  const durations = await page.evaluate(() => ({
    camera: getComputedStyle(document.querySelector(".camera")!).transitionDuration,
    pin: getComputedStyle(document.querySelector(".pin")!).animationName,
  }));
  expect(durations.camera).toBe("0s");
  expect(durations.pin).toBe("none");
});
