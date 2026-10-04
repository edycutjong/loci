// The answer checker: decides whether a recalled answer is right. Plain code, never an AI.
import type { Item } from "./types.js";

// "1. ", "iii) ", "CN I: " at the start is numbering, not part of the answer.
const LEADING_ORDINAL = /^(?:cn\s*)?(?:\d+|[ivxlc]+)[.):]\s+/;

/** Lower case, no accents, no leading numbering, no punctuation, single spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents: "café" → "cafe"
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(LEADING_ORDINAL, "")
    .replace(/[^\p{L}\p{N} ]+/gu, " ") // punctuation becomes a space
    .replace(/\s+/g, " ")
    .trim();
}

/** How many single-letter edits turn `a` into `b`; swapping two neighbouring letters counts as one. */
export function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const change = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + change);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Typos forgiven in one word: 0 for words of up to 4 letters, 1 for 5–9 letters, 2 for 10 or more. */
export const allowance = (wordLength: number) => Math.min(2, Math.floor(0.2 * wordLength));

/** At most this many typos across a whole answer. */
export const MAX_TOTAL_TYPOS = 3;

/** Is `answer` close enough to one target text? */
export function closeEnough(answer: string, target: string): boolean {
  const a = normalize(answer);
  const t = normalize(target);
  if (!a || !t) return false; // an empty answer is never right
  if (a === t) return true;
  const aWords = a.split(" ");
  const tWords = t.split(" ");
  if (aWords.length !== tWords.length) return a.replaceAll(" ", "") === t.replaceAll(" ", ""); // "oatmilk" = "oat milk"
  let total = 0;
  for (let i = 0; i < tWords.length; i++) {
    const typos = distance(aWords[i], tWords[i]);
    if (typos > allowance(tWords[i].length)) return false; // "vitamin c" ≠ "vitamin d": short words must be exact
    total += typos;
  }
  return total <= MAX_TOTAL_TYPOS;
}

/** Right if the answer is close enough to the item or to any answer the learner said they accept. */
export function isRight(answer: string, item: Item): boolean {
  return [item.text, ...item.accepts].some((target) => closeEnough(answer, target));
}
