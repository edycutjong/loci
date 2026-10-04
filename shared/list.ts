// Turns the pasted list into items, and says plainly what stops it from being used.
import type { Item } from "./types.js";

export const MIN_ITEMS = 3;
export const MAX_ITEMS = 12;
export const MAX_WORDS = 4;
export const MAX_CHARS = 40;

// A leading bullet ("-", "*", "•") or ordinal ("1.", "2)", "iii.", "CN I:") is numbering, not part of the item.
const LEADING_MARK = /^(?:[-*•·]\s+|(?:cn\s*)?(?:\d+|[ivxlc]+)[.):](?:\s+|$))/i;

export type ParsedList = {
  items: Item[];
  /** Positions (0-based) of items longer than MAX_WORDS words or MAX_CHARS characters. */
  tooLong: number[];
  /** Why the list can't be built yet, or null when it can. */
  problem: string | null;
};

export function parseItem(line: string): Item | null {
  const clean = line.trim().replace(LEADING_MARK, "").trim();
  if (!clean) return null;
  // Accepted answers are split only on " / " with spaces, so "AC/DC" stays one item.
  const [text, ...accepts] = clean.split(" / ").map((part) => part.trim()).filter(Boolean);
  return text ? { text, accepts } : null;
}

export function isTooLong(item: Item): boolean {
  return item.text.split(/\s+/).length > MAX_WORDS || item.text.length > MAX_CHARS;
}

export function parseList(text: string): ParsedList {
  const items = text.split(/\r?\n/).map(parseItem).filter((item): item is Item => item !== null);
  const tooLong = items.flatMap((item, i) => (isTooLong(item) ? [i] : []));
  let problem: string | null = null;
  if (items.length < MIN_ITEMS) problem = items.length === 0 ? "Paste a list, one item per line." : `Add at least ${MIN_ITEMS} items (you have ${items.length}).`;
  else if (items.length > MAX_ITEMS) problem = `Keep it to ${MAX_ITEMS} items (you have ${items.length}).`;
  else if (tooLong.length) problem = `Keep items to ${MAX_WORDS} words or fewer.`;
  return { items, tooLong, problem };
}

/** "Olfactory → Hypoglossal": how a custom list is named on the home screen. */
export function listTitle(items: Item[]): string {
  if (items.length === 0) return "Empty list";
  return items.length === 1 ? items[0].text : `${items[0].text} → ${items[items.length - 1].text}`;
}
