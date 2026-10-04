import { describe, expect, it } from "vitest";
import { listTitle, parseItem, parseList } from "../shared/list";

describe("parseItem", () => {
  it("drops numbering and bullets but keeps the words", () => {
    expect(parseItem("1. Olfactory")).toEqual({ text: "Olfactory", accepts: [] });
    expect(parseItem("12) Hypoglossal")).toEqual({ text: "Hypoglossal", accepts: [] });
    expect(parseItem("iii. Oculomotor")).toEqual({ text: "Oculomotor", accepts: [] });
    expect(parseItem("CN I: Olfactory")).toEqual({ text: "Olfactory", accepts: [] });
    expect(parseItem("- oat milk")).toEqual({ text: "oat milk", accepts: [] });
    expect(parseItem("• basil")).toEqual({ text: "basil", accepts: [] });
  });

  it("keeps a numeral that is part of the item", () => {
    expect(parseItem("Henry VIII")).toEqual({ text: "Henry VIII", accepts: [] });
    expect(parseItem("Vitamin C")).toEqual({ text: "Vitamin C", accepts: [] });
    expect(parseItem("7 Up")).toEqual({ text: "7 Up", accepts: [] });
  });

  it("splits accepted answers only on ' / ' with spaces", () => {
    expect(parseItem("Vestibulocochlear / auditory / CN VIII")).toEqual({ text: "Vestibulocochlear", accepts: ["auditory", "CN VIII"] });
    expect(parseItem("AC/DC")).toEqual({ text: "AC/DC", accepts: [] });
  });

  it("ignores blank lines", () => {
    expect(parseItem("   ")).toBeNull();
    expect(parseItem("2.  ")).toBeNull();
  });
});

describe("parseList", () => {
  it("accepts 3 to 12 short items", () => {
    const list = parseList("Olfactory\n\nOptic\r\nOculomotor\n");
    expect(list.items.map((i) => i.text)).toEqual(["Olfactory", "Optic", "Oculomotor"]);
    expect(list.problem).toBeNull();
  });

  it("says plainly what is wrong", () => {
    expect(parseList("").problem).toBe("Paste a list, one item per line.");
    expect(parseList("a\nb").problem).toBe("Add at least 3 items (you have 2).");
    expect(parseList(Array.from({ length: 13 }, (_, i) => `item ${i}`).join("\n")).problem).toBe("Keep it to 12 items (you have 13).");
  });

  it("marks items longer than 4 words or 40 characters", () => {
    const list = parseList("one\nthe quick brown fox jumps\ntwo\nPneumonoultramicroscopicsilicovolcanoconiosis\nthree");
    expect(list.tooLong).toEqual([1, 3]);
    expect(list.problem).toBe("Keep items to 4 words or fewer.");
  });

  it("allows exactly 4 words and exactly 12 items", () => {
    expect(parseList("one two three four\nb\nc").problem).toBeNull();
    expect(parseList(Array.from({ length: 12 }, (_, i) => `item ${i}`).join("\n")).problem).toBeNull();
  });
});

describe("listTitle", () => {
  it("names a custom list by its first and last item", () => {
    expect(listTitle([{ text: "Olfactory", accepts: [] }, { text: "Optic", accepts: [] }, { text: "Hypoglossal", accepts: [] }])).toBe("Olfactory → Hypoglossal");
  });
});
