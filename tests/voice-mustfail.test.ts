import { describe, expect, it } from "vitest";
import { parseList } from "../shared/list";
import { interpret, spokenMatch } from "../shared/voice";

// The checker's must-fail pairs (devpost/spec.md), run through the voice path as well. Typed, they already stay dark.
const MUST_FAIL: [said: string, target: string][] = [
  ["vitamin d", "Vitamin C"],
  ["vitamin c", "Vitamin D"],
  ["henry vii", "Henry VIII"],
  ["henry viii", "Henry VII"],
  ["vitamin b1", "Vitamin B2"],
  ["type 2", "Type 1"],
  ["world war i", "World War II"],
  ["louis xv", "Louis XIV"],
];
const item = (text: string) => ({ text, accepts: [] as string[] });

describe("voice keeps the checker's must-fail pairs", () => {
  it("never matches speech that differs from the item in a short word", () => {
    for (const [said, target] of MUST_FAIL) expect(spokenMatch(said, item(target)), `"${said}" for "${target}"`).toBe(false);
  });

  it("'vitamin d' at the Vitamin C stop never lights Vitamin C", () => {
    const vitamins = parseList("Vitamin C\nVitamin D").items;
    // Naming the next stop moves on, as for any list: Vitamin C is missed.
    expect(interpret(["vitamin d"], { order: [0, 1], pos: 0, answered: [false, false] }, vitamins)).toEqual([{ kind: "skip-to", stop: 1 }]);
  });

  it("still hears split words and sound-alikes", () => {
    expect(spokenMatch("vestibular cochlear", item("Vestibulocochlear"))).toBe(true);
    expect(spokenMatch("truck lear", item("Trochlear"))).toBe(true);
    expect(spokenMatch("hippo glossal", item("Hypoglossal"))).toBe(true);
    expect(spokenMatch("vitamin c", item("Vitamin C"))).toBe(true);
  });
});
