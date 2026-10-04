import { describe, expect, it } from "vitest";
import { parseList } from "../shared/list";
import { interpret, soundKey, soundsAlike, spokenMatch, type WalkView } from "../shared/voice";
import { EXAMPLE_LISTS } from "../src/examples/lists";

const nerves = parseList(EXAMPLE_LISTS[0].text).items;
const walkAt = (pos: number, answered: number[] = []): WalkView => ({
  order: nerves.map((_, i) => i),
  pos,
  answered: nerves.map((_, i) => answered.includes(i) || i < pos),
});

describe("spokenMatch", () => {
  it("accepts small mishearings, words run together and sound-alikes", () => {
    expect(spokenMatch("abducent", nerves[5])).toBe(true); // one letter off
    expect(spokenMatch("vestibular cochlear", nerves[7])).toBe(true); // split by the recognizer
    expect(spokenMatch("truck lear", nerves[3])).toBe(true); // sounds like trochlear
    expect(spokenMatch("auditory", nerves[7])).toBe(true); // accepted answer
  });

  it("does not accept a different word", () => {
    expect(spokenMatch("optical illusion", nerves[1])).toBe(false);
    expect(spokenMatch("banana", nerves[9])).toBe(false);
  });
});

describe("sound keys", () => {
  it("map sound-alikes to one key", () => {
    expect(soundKey("trochlear")).toBe(soundKey("truck lear"));
    expect(soundsAlike("hippo glossal", "hypoglossal")).toBe(true);
  });

  it("never let two items of the same example list sound alike", () => {
    for (const list of EXAMPLE_LISTS) {
      const items = parseList(list.text).items;
      for (const a of items) for (const b of items) if (a !== b) expect(spokenMatch(a.text, b), `${list.id}: ${a.text} vs ${b.text}`).toBe(false);
    }
  });

  it("keep hydrogen and nitrogen apart (short keys must match exactly)", () => {
    expect(soundsAlike("nitrogen", "hydrogen")).toBe(false);
  });
});

describe("interpret", () => {
  it("lights the current stop", () => {
    expect(interpret(["olfactory"], walkAt(0), nerves)).toEqual([{ kind: "right", stop: 0 }]);
  });

  it("checks every guess the browser offers", () => {
    expect(interpret(["opticks club", "optic"], walkAt(1), nerves)).toEqual([{ kind: "right", stop: 1 }]);
  });

  it("reads two items said in one breath", () => {
    expect(interpret(["olfactory optic"], walkAt(0), nerves)).toEqual([
      { kind: "right", stop: 0 },
      { kind: "right", stop: 1 },
    ]);
  });

  it("ignores filler words around an answer", () => {
    expect(interpret(["um the trochlear"], walkAt(3), nerves)).toEqual([{ kind: "right", stop: 3 }]);
  });

  it("naming one of the next two stops marks the ones in between missed", () => {
    expect(interpret(["trigeminal"], walkAt(2), nerves)).toEqual([{ kind: "skip-to", stop: 4 }]);
  });

  it("understands skip words", () => {
    expect(interpret(["pass"], walkAt(2), nerves)).toEqual([{ kind: "skip", stop: 2 }]);
    expect(interpret(["I don't know"], walkAt(2), nerves)).toEqual([{ kind: "skip", stop: 2 }]);
  });

  it("another item from further along the list is a wrong answer", () => {
    expect(interpret(["hypoglossal"], walkAt(2), nerves)).toEqual([{ kind: "wrong", stop: 2 }]);
  });

  it("repeating an item already answered is ignored", () => {
    expect(interpret(["olfactory"], walkAt(3), nerves)).toEqual([]);
  });

  it("anything else is not caught, and costs nothing", () => {
    expect(interpret(["a deuce ends"], walkAt(5), nerves)).toEqual([{ kind: "not-caught", heard: "a deuce ends" }]);
    expect(interpret([""], walkAt(5), nerves)).toEqual([]);
  });

  it("does nothing once the walk is over", () => {
    expect(interpret(["hypoglossal"], walkAt(12), nerves)).toEqual([]);
  });
});
