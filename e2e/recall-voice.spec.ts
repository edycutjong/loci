import { expect, test, type Page } from "@playwright/test";
import { NERVES, buildOwnPalace, stubAi } from "./helpers";

const SHOTS = process.env.SHOTS_DIR ?? "test-results/shots";

// A stand-in for the browser's speech recognizer: the test "says" phrases through window.__say.
async function fakeVoice(page: Page, mode: "works" | "blocked" | "absent" = "works") {
  await page.addInitScript((m) => {
    const w = window as unknown as Record<string, unknown>;
    if (m === "absent") {
      delete w.SpeechRecognition;
      delete w.webkitSpeechRecognition;
      return;
    }
    class FakeRecognition {
      lang = "";
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        w.__rec = this;
        setTimeout(() => (m === "blocked" ? (this.onerror?.({ error: "not-allowed" }), this.onend?.()) : this.onstart?.()), 0);
      }
      stop() {
        setTimeout(() => this.onend?.(), 0);
      }
      abort() {
        this.stop();
      }
    }
    w.SpeechRecognition = FakeRecognition;
    w.webkitSpeechRecognition = FakeRecognition;
    w.__say = (alternatives: string[]) => {
      const rec = w.__rec as FakeRecognition;
      const result = Object.assign(alternatives.map((t) => ({ transcript: t, confidence: 0.9 })), { isFinal: true });
      rec.onresult?.({ resultIndex: 0, results: [result] });
    };
  }, mode);
}

const say = (page: Page, ...alternatives: string[]) => page.evaluate((a) => (window as unknown as { __say: (x: string[]) => void }).__say(a), alternatives);

test("eyes closed: saying the 12 items lights 12 pins without touching the screen again", async ({ page }) => {
  await fakeVoice(page);
  await stubAi(page);
  await buildOwnPalace(page);
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  await page.getByRole("button", { name: "Say it instead" }).click();
  await expect(page.getByRole("button", { name: "Listening. Tap to stop" })).toBeVisible();

  for (const item of NERVES) await say(page, item.toLowerCase());

  await expect(page.locator(".result-title")).toHaveText("You remembered all 12 on the first try.");
  await expect(page.locator('.palace .pin[data-state="right"]')).toHaveCount(12);
  await expect(page.locator(".palace .stage")).toHaveAttribute("data-all-lit", "true");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/voice-all-lit.png` });
});

test("voice: two items in one breath, a mishearing that costs nothing, a skip, and a jump ahead", async ({ page }) => {
  await fakeVoice(page);
  await stubAi(page);
  await buildOwnPalace(page);
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  await page.getByRole("button", { name: "Say it instead" }).click();

  await say(page, "olfactory optic"); // stops 1 and 2
  await expect(page.locator('.palace .pin[data-state="right"]')).toHaveCount(2);
  await say(page, "a deuce ends", "a deuce end"); // matches nothing in the list: not caught
  await expect(page.locator(".feedback")).toHaveText("Didn't catch that. Say it again, or type it.");
  await expect(page.locator(".heard")).toContainText("a deuce ends");
  await expect(page.locator('.palace .pin[data-state="wrong"]')).toHaveCount(0);
  await say(page, "pass"); // stop 3 skipped
  await expect(page.locator(".feedback")).toHaveText("Stop 3: skipped.");
  await say(page, "truck lear"); // sounds like trochlear: stop 4
  await say(page, "abducens"); // stop 6 named while stop 5 is asked: 5 missed, 6 right
  await expect(page.locator('.palace .pin[data-state="wrong"]')).toHaveCount(2);
  await expect(page.locator('.palace .pin[data-state="right"]')).toHaveCount(4);
  await expect(page.locator(".recall .scene-count")).toHaveText(" · stop 7 of 12"); // now asking stop 7
  await page.screenshot({ path: `${SHOTS}/voice-mixed.png` });

  for (const item of NERVES.slice(6)) await say(page, item.toLowerCase());
  await expect(page.locator(".result-title")).toHaveText("You remembered 10 of 12 on the first try.");
  await page.getByRole("button", { name: "Retry the 2 missed stops" }).click();
  // The retry starts with nothing heard yet; it showed the last word of the walk before (seen in the demo recording).
  await expect(page.locator(".heard")).toHaveText("Close your eyes and say the list, one item at a time.");
});

test("a blocked microphone says so and typing still works", async ({ page }) => {
  await fakeVoice(page, "blocked");
  await stubAi(page);
  await buildOwnPalace(page, NERVES.slice(0, 3));
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  await page.getByRole("button", { name: "Say it instead" }).click();
  await expect(page.locator(".heard")).toHaveText("The microphone is blocked. Allow it in your browser, or type your answers.");
  const box = page.getByPlaceholder("Type it");
  await box.fill("olfactory");
  await box.press("Enter");
  await expect(page.locator(".feedback")).toHaveText("Stop 1: Olfactory. Right.");
});

test("a browser without voice offers typing only", async ({ page }) => {
  await fakeVoice(page, "absent");
  await stubAi(page);
  await buildOwnPalace(page, NERVES.slice(0, 3));
  await page.getByRole("button", { name: "Recall, lights out" }).click();
  await expect(page.locator(".voice-note")).toHaveText("Voice isn't available in this browser. Type your answers.");
  await expect(page.getByRole("button", { name: "Say it instead" })).toHaveCount(0);
});
