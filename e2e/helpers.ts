import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

// Browser checks never call an AI provider: /api/anchors answers with a real recorded answer for the student room,
// and /api/scenes writes a plain scene from each object + item it is sent.
export const NERVES = ["Olfactory", "Optic", "Oculomotor", "Trochlear", "Trigeminal", "Abducens", "Facial", "Vestibulocochlear", "Glossopharyngeal", "Vagus", "Accessory", "Hypoglossal"];
const kos = JSON.parse(readFileSync(new URL("./fixtures/kos-anchors.json", import.meta.url), "utf8"));

export type StubOptions = { anchors?: (count: number) => { status: number; body: unknown }; scenesStatus?: number };

export async function stubAi(page: Page, options: StubOptions = {}) {
  const calls = { anchors: 0, scenes: 0 };
  await page.route("**/api/anchors", async (route) => {
    calls.anchors++;
    const answer = options.anchors?.(calls.anchors) ?? { status: 200, body: { anchors: kos.anchors, model: "stub (recorded gemini answer)", ms: 1 } };
    await route.fulfill({ status: answer.status, contentType: "application/json", body: JSON.stringify(answer.body) });
  });
  await page.route("**/api/scenes", async (route) => {
    calls.scenes++;
    if (options.scenesStatus && options.scenesStatus !== 200) {
      return route.fulfill({ status: options.scenesStatus, contentType: "application/json", body: JSON.stringify({ error: "Couldn't reach the AI to write your scenes." }) });
    }
    const { stops } = route.request().postDataJSON() as { stops: { object: string; item: string }[] };
    const scenes = stops.map((s, i) => ({ stop: i + 1, scene: `Your ${s.object} sings "${s.item}" every time you walk past.`, soundsLike: "" }));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ scenes, model: "stub", ms: 1 }) });
  });
  return calls;
}

/** Home → own photo (the student room) + a list → Build → Learn opens at stop 1. */
export async function buildOwnPalace(page: Page, items: string[] = NERVES) {
  await page.goto("/");
  await page.getByTestId("photo-input").setInputFiles("public/rooms/kos.jpg");
  await page.getByLabel("Your list").fill(items.join("\n"));
  await page.getByRole("button", { name: "Build my palace" }).click();
  await page.locator("#scene-item").waitFor();
}

/** Types an answer for the stop being asked. */
export async function typeAnswer(page: Page, text: string) {
  const box = page.getByPlaceholder("Type it");
  await box.fill(text);
  await box.press("Enter");
}
