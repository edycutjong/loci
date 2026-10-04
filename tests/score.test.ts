import { describe, expect, it } from "vitest";
import { allowance, closeEnough, distance, isRight, normalize } from "../shared/score";

const item = (text: string, ...accepts: string[]) => ({ text, accepts });

describe("normalize", () => {
  it("lowercases, strips accents, punctuation and leading numbering", () => {
    expect(normalize("  OLFACTORY  ")).toBe("olfactory");
    expect(normalize("Café")).toBe("cafe");
    expect(normalize("1. Olfactory")).toBe("olfactory");
    expect(normalize("CN I: Olfactory")).toBe("olfactory");
    expect(normalize("iii. oculomotor")).toBe("oculomotor");
    expect(normalize("soy-sauce!")).toBe("soy sauce");
  });

  it("keeps a numeral that is part of the answer", () => {
    expect(normalize("Henry VIII")).toBe("henry viii");
    expect(normalize("Vitamin C")).toBe("vitamin c");
  });

  it("strips a numeral-like first word followed by punctuation (known, accepted limit)", () => {
    expect(normalize("civic: duty")).toBe("duty");
  });
});

describe("distance", () => {
  it("counts edits, with a swap of neighbours as one", () => {
    expect(distance("oculomotor", "occulomotor")).toBe(1);
    expect(distance("trochlear", "trochlaer")).toBe(1); // swap
    expect(distance("kitten", "sitting")).toBe(3);
    expect(distance("", "abc")).toBe(3);
  });
});

describe("allowance", () => {
  it("is 0 up to 4 letters, 1 for 5–9, 2 from 10", () => {
    expect([1, 4, 5, 9, 10, 17].map(allowance)).toEqual([0, 0, 1, 1, 2, 2]);
  });
});

describe("closeEnough — boundary cases from the spec", () => {
  it("forgives up to the allowance and not one more", () => {
    // "trigeminal" has 10 letters: 2 typos allowed.
    expect(closeEnough("trigeminel", "Trigeminal")).toBe(true); // 1
    expect(closeEnough("trygeminel", "Trigeminal")).toBe(true); // 2 = allowance
    expect(closeEnough("trygemenel", "Trigeminal")).toBe(false); // 3 = allowance + 1
    // "abducens" has 8 letters: 1 typo allowed.
    expect(closeEnough("abducns", "Abducens")).toBe(true);
    expect(closeEnough("abdcns", "Abducens")).toBe(false);
  });

  it("accepts the classic misspelling of oculomotor", () => {
    expect(closeEnough("occulomotor", "Oculomotor")).toBe(true);
  });

  it("needs short words exactly", () => {
    expect(closeEnough("neon", "Neon")).toBe(true);
    expect(closeEnough("nein", "Neon")).toBe(false);
    expect(closeEnough("Vitamin D", "Vitamin C")).toBe(false);
    expect(closeEnough("Henry VII", "Henry VIII")).toBe(false);
  });

  it("handles a 1-letter item and empty answers", () => {
    expect(closeEnough("c", "C")).toBe(true);
    expect(closeEnough("d", "C")).toBe(false);
    expect(closeEnough("", "I")).toBe(false);
    expect(closeEnough("   ", "Olfactory")).toBe(false);
    expect(closeEnough("!!", "Olfactory")).toBe(false);
  });

  it("drops leading numbering before comparing, in either text", () => {
    expect(closeEnough("olfactory", "1. Olfactory")).toBe(true);
    expect(closeEnough("1. olfactory", "Olfactory")).toBe(true);
  });

  it("treats words run together or split the same", () => {
    expect(closeEnough("oatmilk", "oat milk")).toBe(true);
    expect(closeEnough("oat milk", "oatmilk")).toBe(true);
    expect(closeEnough("vitaminc", "vitamin d")).toBe(false);
  });

  it("caps typos across a whole multi-word answer at 3", () => {
    // Each 6-letter word may have 1 typo, but 4 in total is too many.
    expect(closeEnough("glossy appla greem tablus", "glossy apple green tables")).toBe(true); // 3
    expect(closeEnough("glosxy appla greem tablus", "glossy apple green tables")).toBe(false); // 4
  });

  it("never accepts a different item from the same list", () => {
    const nerves = ["Olfactory", "Optic", "Oculomotor", "Trochlear", "Trigeminal", "Abducens", "Facial", "Vestibulocochlear", "Glossopharyngeal", "Vagus", "Accessory", "Hypoglossal"];
    for (const a of nerves) for (const b of nerves) if (a !== b) expect(closeEnough(a, b), `${a} vs ${b}`).toBe(false);
  });
});

describe("isRight", () => {
  it("accepts the item or any accepted answer", () => {
    const vest = item("Vestibulocochlear", "auditory", "CN VIII");
    expect(isRight("vestibulocochlear", vest)).toBe(true);
    expect(isRight("Auditory", vest)).toBe(true);
    expect(isRight("cn viii", vest)).toBe(true);
    expect(isRight("vestibular", vest)).toBe(false);
  });
});
