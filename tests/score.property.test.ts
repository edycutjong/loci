import fc from "fast-check";
import { describe, it } from "vitest";
import { closeEnough } from "../shared/score";

// Property tests for the answer checker (shared/score.ts), the one decision in Loci that turns a stop green.
// Every case is built so its right verdict is known without asking the checker: one edit is at most one typing
// change, any edit of a word is at least one, and n added letters are at least n.
// The rule under test, from devpost/spec.md: a word of up to 4 letters must be exact, 5–9 letters forgive 1 change,
// 10 or more forgive 2, and a whole answer forgives at most 3.
// 6 properties × RUNS generated cases each = 60,000 cases per run.
const RUNS = 10_000;
const forgiven = (letters: number) => (letters <= 4 ? 0 : letters <= 9 ? 1 : 2);

const ALPHA = [..."abcdefghijklmnopqrstuvwxyz"];
const word = (min: number, max: number) => fc.array(fc.constantFrom(...ALPHA), { minLength: min, maxLength: max }).map((cs) => cs.join(""));
const words = (min: number, max: number, letters: [number, number] = [1, 12]) => fc.array(word(...letters), { minLength: min, maxLength: max });
/** An item with one word of `letters` letters at a random position among 0–3 other words. */
const itemWith = (letters: [number, number]) =>
  fc.tuple(words(0, 3), word(...letters), fc.nat()).map(([others, w, at]) => {
    const i = at % (others.length + 1);
    return { words: [...others.slice(0, i), w, ...others.slice(i)], i };
  });
const said = (ws: string[]) => ws.join(" ");
const replace = (ws: string[], i: number, w: string) => ws.map((x, k) => (k === i ? w : x));

const ACCENTED: Record<string, string[]> = { a: ["á", "à", "â", "ä"], e: ["é", "è", "ê", "ë"], i: ["í", "ï"], o: ["ó", "ö", "ô"], u: ["ú", "ü"], c: ["ç"], n: ["ñ"] };
/** The same word as someone might type it: any letter in either case, some with accents. */
const retyped = (w: string) =>
  fc.tuple(...[...w].map((c) => fc.constantFrom(c, c.toUpperCase(), ...(ACCENTED[c] ?? []), ...(ACCENTED[c] ?? []).map((a) => a.toUpperCase())))).map((cs) => cs.join(""));

describe("the answer checker, on generated answers", () => {
  it("the exact item is always right, however it is typed: case, accents, spacing, punctuation, leading numbering", () => {
    const answer = words(1, 4).chain((ws) =>
      fc.record({
        ws: fc.constant(ws),
        typed: fc.tuple(...ws.map(retyped)),
        gaps: fc.array(fc.constantFrom(" ", "  ", "\t", " - ", "-", ", "), { minLength: ws.length - 1, maxLength: ws.length - 1 }),
        lead: fc.constantFrom("", "  ", "1. ", "12) ", "iv. ", "CN III: ", "- ", "• "),
        tail: fc.constantFrom("", " ", "!", ".", "?!", " ...", "”"),
      }),
    );
    fc.assert(
      fc.property(answer, ({ ws, typed, gaps, lead, tail }) => {
        const text = lead + typed.map((t, k) => (k ? gaps[k - 1] : "") + t).join("") + tail;
        return closeEnough(text, said(ws));
      }),
      { numRuns: RUNS },
    );
  });

  it("one typing change in a word of 5 or more letters is forgiven, in any case and with accents: a letter changed, missing, added or two swapped", () => {
    const edit = fc.record({ kind: fc.constantFrom("change", "drop", "add", "swap"), at: fc.nat(), letter: fc.constantFrom(...ALPHA) });
    const answer = fc.tuple(itemWith([5, 14]), edit).chain(([{ words: ws, i }, { kind, at, letter }]) => {
      const w = ws[i];
      const p = at % w.length;
      const typo =
        kind === "change" ? w.slice(0, p) + letter + w.slice(p + 1)
        : kind === "drop" ? w.slice(0, p) + w.slice(p + 1)
        : kind === "add" ? w.slice(0, p) + letter + w.slice(p)
        : p + 1 < w.length ? w.slice(0, p) + w[p + 1] + w[p] + w.slice(p + 2)
        : w;
      return fc.record({ ws: fc.constant(ws), typed: fc.tuple(...replace(ws, i, typo).map(retyped)) });
    });
    fc.assert(
      fc.property(answer, ({ ws, typed }) => closeEnough(said(typed), said(ws))),
      { numRuns: RUNS },
    );
  });

  it("a word of up to 4 letters must be exact: one letter changed, missing or added is never right ('Vitamin D' for 'Vitamin C')", () => {
    const edit = fc.record({ kind: fc.constantFrom("change", "drop", "add"), at: fc.nat(), shift: fc.integer({ min: 1, max: 25 }), letter: fc.constantFrom(...ALPHA) });
    fc.assert(
      fc.property(itemWith([1, 4]), edit, ({ words: ws, i }, { kind, at, shift, letter }) => {
        const w = ws[i];
        const p = at % w.length;
        const offByOne =
          kind === "change" ? w.slice(0, p) + ALPHA[(ALPHA.indexOf(w[p]) + shift) % 26] + w.slice(p + 1)
          : kind === "drop" ? w.slice(0, p) + w.slice(p + 1)
          : w.slice(0, p) + letter + w.slice(p);
        return !closeEnough(said(replace(ws, i, offByOne)), said(ws));
      }),
      { numRuns: RUNS },
    );
  });

  it("one typing change more than a word forgives is never right", () => {
    fc.assert(
      fc.property(itemWith([1, 14]), word(3, 3), ({ words: ws, i }, extra) => {
        const w = ws[i];
        const tooFar = w + extra.slice(0, forgiven(w.length) + 1); // n added letters are at least n changes
        return !closeEnough(said(replace(ws, i, tooFar)), said(ws));
      }),
      { numRuns: RUNS },
    );
  });

  it("more than 3 changes in one answer are never right, even when every word is within its own allowance; 3 are", () => {
    fc.assert(
      fc.property(words(4, 4, [10, 14]), fc.array(fc.constantFrom(...ALPHA), { minLength: 4, maxLength: 4 }), (ws, extra) => {
        const four = ws.map((w, k) => w + extra[k]); // one change in each 10+ letter word (each forgives 2)
        const three = ws.map((w, k) => (k < 3 ? w + extra[k] : w));
        return !closeEnough(said(four), said(ws)) && closeEnough(said(three), said(ws));
      }),
      { numRuns: RUNS },
    );
  });

  it("an answer with no letters or digits is never right", () => {
    const blank = fc.array(fc.constantFrom(" ", "\t", ".", ",", "!", "?", "-", "–", ":", ";", "'", '"', "(", ")", "/", "…"), { minLength: 0, maxLength: 8 }).map((cs) => cs.join(""));
    fc.assert(
      fc.property(words(1, 4), blank, (ws, answer) => !closeEnough(answer, said(ws))),
      { numRuns: RUNS },
    );
  });
});
