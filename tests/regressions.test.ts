import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scenePrompt } from "../shared/prompts";
import { runLadder, type Attempt } from "../shared/providers";
import { closeEnough, distance, normalize } from "../shared/score";
import { soundKey, soundsAlike } from "../shared/voice";

// Regression tests, one per real defect found while planning and building Loci (devpost/checklist.md, git log).
// Each name says what went wrong; the body pins the fix. The browser-level ones are in e2e/regressions.spec.ts.

const text = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("regressions", () => {
  it("one typo allowance for the whole answer let 'Vitamin D' pass for 'Vitamin C': typos now count per word", () => {
    // The planning notes' first rule: up to min(2, 20% of the whole answer's length) typos anywhere in it.
    const wholeAnswerRule = (said: string, target: string) => distance(normalize(said), normalize(target)) <= Math.min(2, Math.floor(0.2 * normalize(target).length));
    for (const [said, target] of [
      ["Vitamin D", "Vitamin C"],
      ["Henry VII", "Henry VIII"],
    ]) {
      expect(wholeAnswerRule(said, target), `the old rule accepted ${said} for ${target}`).toBe(true);
      expect(closeEnough(said, target), `${said} for ${target}`).toBe(false);
    }
  });

  it("the first sound key split 'hippo glossal' from 'hypoglossal' and nearly joined Hydrogen and Nitrogen", () => {
    expect(soundKey("hippo glossal")).toBe(soundKey("hypoglossal"));
    expect(soundsAlike("hippo glossal", "hypoglossal")).toBe(true);
    expect(soundKey("hydrogen")).not.toBe(soundKey("nitrogen"));
    expect(soundsAlike("hydrogen", "nitrogen")).toBe(false);
    expect(soundsAlike("nitrogen", "hydrogen")).toBe(false);
  });

  it("with only a rule, DeepSeek dropped the item's exact spelling in 8 of 12 sound-alike scenes: the prompt shows a worked example", () => {
    const pairs = [
      { object: "wall clock", item: "Trochlear" },
      { object: "yellow raincoat", item: "Olfactory" },
    ];
    const prompt = scenePrompt(pairs);
    expect(prompt).toContain("Write the item itself, spelled exactly as given, in every scene, even when the image rests on a sound-alike.");
    expect(prompt).toContain("honking 'Trochlear!' as it circles the room.");
    for (const p of pairs) expect(prompt).toContain(`object: "${p.object}" - item: "${p.item}"`);
  });

  it("a scenes call ran out of its time budget: a model that times out hands over to the next one inside the same budget", async () => {
    const takeText = (raw: unknown) => (typeof raw === "string" ? raw : null);
    const hangs: Attempt<string> = {
      name: "slow-model",
      ms: 40,
      key: () => "key",
      call: (_key, signal) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
      accept: takeText,
    };
    const answers: Attempt<string> = { name: "next-model", ms: 1_000, key: () => "key", call: async () => ({ json: "a scene", tokens: null }), accept: takeText };
    const result = await runLadder([hangs, answers], 5_000);
    expect(result).toMatchObject({ value: "a scene", model: "next-model", tried: ["slow-model: timed out"] });
  });

  it("the disabled Build button's label measured about 1.3:1 at 45% opacity: disabled controls use readable colours, never opacity", () => {
    const css = text("../src/styles/app.css");
    const tokens = text("../src/styles/tokens.css");
    const token = (name: string) => tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))![1];
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    const disabled = [...css.matchAll(/([^{}]*:disabled[^{]*)\{([^}]*)\}/g)];
    expect(disabled.length).toBeGreaterThan(3);
    for (const [, selector, body] of disabled) expect(body, selector.trim()).not.toMatch(/opacity/);

    const primary = css.match(/\.btn-primary:disabled\s*\{([^}]*)\}/)![1];
    const ground = primary.match(/background:\s*var\(--([\w-]+)\)/)![1];
    const label = primary.match(/(?:^|;|\s)color:\s*var\(--([\w-]+)\)/)![1];
    expect(ratio(token(label), token(ground)), `${label} on ${ground}`).toBeGreaterThanOrEqual(4.5);
  });
});
