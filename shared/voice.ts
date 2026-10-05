// The voice interpreter: turns one spoken phrase (the browser's best guesses) into recall actions.
// It reuses the answer checker, adds a sound-alike check, and never turns a mishearing into a wrong answer:
// a phrase that matches nothing in the list is "not caught" and costs nothing.
import { allowance, closeEnough, distance, normalize } from "./score.js";
import type { Item } from "./types.js";

/** Whole phrases that mean "I don't know this one". */
export const SKIP_PHRASES = new Set(["skip", "pass", "next", "i dont know", "dont know", "i don t know", "don t know", "no idea", "skip it", "pass it"]);
/** Words people say around an answer: "um, the trochlear". */
const FILLERS = new Set(["um", "uh", "er", "erm", "ah", "hmm", "the", "a", "an", "and", "then", "its", "it", "is", "okay", "ok", "so", "like"]);

/** A consonant skeleton (no vowels, h, w or y): words that sound alike get the same key ("truck lear" and "trochlear" → "trklr"). */
export function soundKey(text: string): string {
  let w = normalize(text).replace(/[^a-z]/g, "");
  w = w
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/q/g, "k")
    .replace(/x/g, "ks")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k")
    .replace(/z/g, "s")
    .replace(/v/g, "f")
    .replace(/b/g, "p")
    .replace(/d/g, "t")
    .replace(/g/g, "k")
    .replace(/[hwy]/g, "");
  return w.replace(/[aeiou]/g, "").replace(/(.)\1+/g, "$1");
}

/** Same key for keys of 4–5 letters; one letter off allowed from 6. Shorter keys never count (too many collisions). */
export function soundsAlike(spoken: string, target: string): boolean {
  const a = soundKey(spoken);
  const b = soundKey(target);
  if (b.length < 4) return false;
  return a === b || (b.length >= 6 && distance(a, b) <= 1);
}

/** Every word of 4 letters or fewer in the target was heard exactly. The two rules below join the words, so without
 *  this they would let "vitamin d" pass for "vitamin c": the checker's short-words-exact rule, kept for voice. */
function shortWordsHeard(spoken: string, target: string): boolean {
  const heard = new Set(normalize(spoken).split(" "));
  return normalize(target).split(" ").every((w) => w.length > 4 || heard.has(w));
}

/** Is this stretch of speech the item (or one of its accepted answers)? */
export function spokenMatch(spoken: string, item: Item): boolean {
  for (const target of [item.text, ...item.accepts]) {
    if (closeEnough(spoken, target)) return true;
    if (!shortWordsHeard(spoken, target)) continue; // "vitamin d" ≠ "vitamin c", as when typed
    const a = normalize(spoken).replaceAll(" ", "");
    const b = normalize(target).replaceAll(" ", "");
    if (b.length >= 5 && distance(a, b) <= allowance(b.length)) return true; // "vestibular cochlear"
    if (b.length >= 5 && soundsAlike(a, b)) return true; // "truck lear"
  }
  return false;
}

export type VoiceAction =
  | { kind: "right"; stop: number }
  | { kind: "skip-to"; stop: number } // a later stop was named: the ones before it are missed
  | { kind: "skip"; stop: number }
  | { kind: "wrong"; stop: number }
  | { kind: "not-caught"; heard: string };

export type WalkView = {
  /** Stops asked in this walk, in order, and the position being asked. */
  order: number[];
  pos: number;
  /** Per stop: already answered (in this walk or remembered before a retry). */
  answered: boolean[];
};

const LOOK_AHEAD = 2;
const MAX_WINDOW = 5;

/** Reads as many stops as the phrase names, in order, starting at the stop being asked. */
function consume(words: string[], walk: WalkView, items: Item[]): VoiceAction[] {
  const actions: VoiceAction[] = [];
  let pos = walk.pos;
  let i = 0;
  while (pos < walk.order.length && i < words.length) {
    while (i < words.length && FILLERS.has(words[i])) i++;
    if (i >= words.length) break;
    let matched = false;
    for (let k = 0; k <= LOOK_AHEAD && pos + k < walk.order.length && !matched; k++) {
      const stop = walk.order[pos + k];
      for (let len = Math.min(MAX_WINDOW, words.length - i); len >= 1; len--) {
        if (spokenMatch(words.slice(i, i + len).join(" "), items[stop])) {
          actions.push(k === 0 ? { kind: "right", stop } : { kind: "skip-to", stop });
          pos += k + 1;
          i += len;
          matched = true;
          break;
        }
      }
    }
    if (!matched) break;
  }
  return actions;
}

const progress = (actions: VoiceAction[]) => actions.filter((a) => a.kind === "right" || a.kind === "skip-to").length;

/** Drops leading words that name stops already answered: someone starting over, or Chrome's on-device model echoing
 *  the list's hints before the word itself ("Cambrian Jurassic Quaternary" for "Quaternary"). Tried only as a second
 *  reading, so a phrase that already counts as said is never changed ("vitamin d" after Vitamin C). */
function dropAnswered(words: string[], walk: WalkView, items: Item[]): string[] {
  let i = 0;
  scan: while (i < words.length) {
    for (let len = Math.min(MAX_WINDOW, words.length - i); len >= 1; len--) {
      const said = words.slice(i, i + len).join(" ");
      if (items.some((item, k) => walk.answered[k] && spokenMatch(said, item))) {
        i += len;
        continue scan;
      }
    }
    break;
  }
  return words.slice(i);
}

/** What was heard, each word once: the on-device model with hints can repeat a word ("Cretaceous Cretaceous Cretaceous"). */
export function heardOnce(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.filter((w, i) => i === 0 || w.toLowerCase() !== words[i - 1].toLowerCase()).join(" ");
}

export function interpret(alternatives: string[], walk: WalkView, items: Item[]): VoiceAction[] {
  const current = walk.order[walk.pos];
  if (current === undefined) return [];
  const heard = alternatives.find((a) => a.trim()) ?? "";
  const top = normalize(heard).replace(/'/g, "");
  if (!top) return [];
  if (SKIP_PHRASES.has(top)) return [{ kind: "skip", stop: current }];

  let best: VoiceAction[] = [];
  for (const alt of alternatives) {
    const words = normalize(alt).split(" ").filter(Boolean);
    for (const attempt of [words, dropAnswered(words, walk, items)]) {
      const actions = consume(attempt, walk, items);
      if (progress(actions) > progress(best)) best = actions;
    }
  }
  if (best.length) return best;

  // Not the current stop or the next two. Another item of the list said here is a wrong answer;
  // an item already answered is someone repeating themselves, and is ignored.
  for (const alt of alternatives) {
    for (let k = 0; k < items.length; k++) {
      if (k === current || !spokenMatch(alt, items[k])) continue;
      return walk.answered[k] ? [] : [{ kind: "wrong", stop: current }];
    }
  }
  return [{ kind: "not-caught", heard: heard.trim() }];
}
