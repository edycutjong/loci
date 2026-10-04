// A recall walk as plain data: which stops are asked, in what order, and how each one went.
// The screen only reads it; every change goes through these functions (unit-tested).

export type Outcome = "pending" | "right" | "wrong";

export type Walking = {
  kind: "full" | "retry";
  /** Stops asked in this walk, in route order (a retry asks only the missed ones). */
  order: number[];
  /** Position in `order` of the stop being asked now. */
  pos: number;
  /** Per stop of the whole palace; stops not in `order` stay "pending". */
  outcomes: Outcome[];
  startedAt: number;
  endedAt: number | null;
};

export function startWalk(total: number, now: number, retryStops?: number[]): Walking {
  const order = retryStops ?? Array.from({ length: total }, (_, i) => i);
  return { kind: retryStops ? "retry" : "full", order, pos: 0, outcomes: Array<Outcome>(total).fill("pending"), startedAt: now, endedAt: null };
}

export function currentStop(w: Walking): number | null {
  return w.pos < w.order.length ? w.order[w.pos] : null;
}

/** Records the current stop as right or wrong and moves on; the last answer ends the walk. */
export function answer(w: Walking, right: boolean, now: number): Walking {
  const stop = currentStop(w);
  if (stop === null) return w;
  const outcomes = [...w.outcomes];
  outcomes[stop] = right ? "right" : "wrong";
  const pos = w.pos + 1;
  return { ...w, outcomes, pos, endedAt: pos >= w.order.length ? now : null };
}

/** Marks every stop before `target` (in this walk's order) as missed, then `target` as right. Used by voice look-ahead. */
export function skipTo(w: Walking, target: number, now: number): Walking {
  let next = w;
  while (currentStop(next) !== null && currentStop(next) !== target) next = answer(next, false, now);
  return currentStop(next) === target ? answer(next, true, now) : next;
}

export type Result = { firstTry: boolean[]; afterRetry: boolean[] | null; learnMs: number | null; recallMs: number; at: number };

/** Folds a finished walk into the palace's latest result: a full walk starts fresh; a retry only adds greens. */
export function fold(previous: Result | null, w: Walking, learnMs: number | null): Result {
  const at = w.endedAt ?? w.startedAt;
  const recallMs = Math.max(0, at - w.startedAt);
  if (w.kind === "full" || !previous) {
    return { firstTry: w.outcomes.map((o) => o === "right"), afterRetry: null, learnMs, recallMs, at };
  }
  const base = previous.afterRetry ?? previous.firstTry;
  return { ...previous, afterRetry: base.map((ok, i) => ok || w.outcomes[i] === "right") };
}

export const count = (flags: boolean[]) => flags.filter(Boolean).length;

/** One plain line to paste back to a friend or a study group. */
export function resultLine(r: Result, total: number, date: Date, format: (ms: number) => string): string {
  const parts = ["Loci", `${total} items`, `first try ${count(r.firstTry)}/${total}`];
  if (r.afterRetry) parts.push(`after retry ${count(r.afterRetry)}/${total}`);
  if (r.learnMs !== null) parts.push(`learn ${format(r.learnMs)}`);
  parts.push(`recall ${format(r.recallMs)}`, date.toISOString().slice(0, 10));
  return parts.join(" · ");
}
