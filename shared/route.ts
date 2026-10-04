// Turns the AI's objects into stops and orders them into one walk through the photo.
// The AI proposes; this code decides: which objects are used, and in what order.
import type { Anchor, Box } from "./types.js";

/** Two kept objects' centres must be at least this share of the photo's diagonal apart, so pins never overlap. */
export const MIN_GAP = 0.07;
/** Objects with the same name closer than this share of the diagonal are the same object found twice. */
export const SAME_NAME_GAP = 0.05;
/** Boxes overlapping more than this (intersection over union) are the same object. */
export const MAX_OVERLAP = 0.5;
/** The exact route search is used up to this many stops (the list limit is 12). */
const EXACT_LIMIT = 14;

export type Point = { x: number; y: number };

/** [ymin, xmin, ymax, xmax] in 0–1000 (y first) → a pixel rectangle on a photo of size w × h. */
export function boxToPixels(box: Box, w: number, h: number) {
  const [ymin, xmin, ymax, xmax] = box;
  return { x: (xmin / 1000) * w, y: (ymin / 1000) * h, width: ((xmax - xmin) / 1000) * w, height: ((ymax - ymin) / 1000) * h };
}

export function boxCentre(box: Box, w: number, h: number): Point {
  const r = boxToPixels(box, w, h);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

export function overlap(a: Box, b: Box): number {
  const ix = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const iy = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const inter = ix * iy;
  const union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter;
  return union > 0 ? inter / union : 0;
}

const sameName = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === b.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Walks the AI's objects in its own order (most memorable first) and keeps each one that is not a duplicate
 * and not crowding an object already kept. Returns at most `n` objects, still in that order.
 */
export function chooseAnchors(anchors: Anchor[], n: number, w: number, h: number): Anchor[] {
  const diag = Math.hypot(w, h);
  const kept: { anchor: Anchor; c: Point }[] = [];
  for (const anchor of anchors) {
    if (kept.length >= n) break;
    const c = boxCentre(anchor.box, w, h);
    const clash = kept.some((k) => {
      const gap = Math.hypot(k.c.x - c.x, k.c.y - c.y);
      if (overlap(k.anchor.box, anchor.box) > MAX_OVERLAP) return true;
      if (sameName(k.anchor.label, anchor.label) && gap < SAME_NAME_GAP * diag) return true;
      return gap < MIN_GAP * diag;
    });
    if (!clash) kept.push({ anchor, c });
  }
  return kept.map((k) => k.anchor);
}

/** How many usable stops a photo offers, for the "Found 8 good spots for 12 items" message. */
export function countUsable(anchors: Anchor[], w: number, h: number): number {
  return chooseAnchors(anchors, Number.POSITIVE_INFINITY, w, h).length;
}

/**
 * The shortest path that starts at the leftmost point and ends at the rightmost one, visiting every point once.
 * Exact (Held-Karp) for up to 14 points, a few milliseconds; an optimal path never crosses itself.
 * Returns the visiting order as indexes into `points`.
 */
export function shortestRoute(points: Point[]): number[] {
  const n = points.length;
  if (n === 0) return [];
  let start = 0;
  let end = 0;
  points.forEach((p, i) => {
    const s = points[start];
    const e = points[end];
    if (p.x < s.x || (p.x === s.x && p.y < s.y)) start = i;
    if (p.x > e.x || (p.x === e.x && p.y > e.y)) end = i;
  });
  if (n === 1) return [0];
  if (n === 2) return [start, end];
  if (n > EXACT_LIMIT) return points.map((_, i) => i).sort((a, b) => points[a].x - points[b].x || points[a].y - points[b].y);

  const dist = (a: number, b: number) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y);
  const full = (1 << n) - 1;
  const cost = new Float64Array((1 << n) * n).fill(Number.POSITIVE_INFINITY);
  const prev = new Int8Array((1 << n) * n).fill(-1);
  cost[(1 << start) * n + start] = 0;
  for (let mask = 1; mask <= full; mask++) {
    if (!(mask & (1 << start))) continue;
    for (let j = 0; j < n; j++) {
      const here = cost[mask * n + j];
      if (here === Number.POSITIVE_INFINITY) continue;
      for (let k = 0; k < n; k++) {
        if (mask & (1 << k)) continue;
        const next = mask | (1 << k);
        if (k === end && next !== full) continue; // the rightmost point is always the last stop
        const total = here + dist(j, k);
        if (total < cost[next * n + k]) {
          cost[next * n + k] = total;
          prev[next * n + k] = j;
        }
      }
    }
  }
  const order: number[] = [];
  let mask = full;
  let j = end;
  while (j !== -1) {
    order.push(j);
    const p = prev[mask * n + j];
    mask &= ~(1 << j);
    j = p;
  }
  return order.reverse();
}

export function routeLength(points: Point[], order: number[]): number {
  let total = 0;
  for (let i = 1; i < order.length; i++) total += Math.hypot(points[order[i]].x - points[order[i - 1]].x, points[order[i]].y - points[order[i - 1]].y);
  return total;
}

/** Choose `n` objects and put them in walking order. `available` < n means the photo is short of stops. */
export function planRoute(anchors: Anchor[], n: number, w: number, h: number): { stops: Anchor[]; available: number } {
  const available = countUsable(anchors, w, h);
  const chosen = chooseAnchors(anchors, n, w, h);
  const order = shortestRoute(chosen.map((a) => boxCentre(a.box, w, h)));
  return { stops: order.map((i) => chosen[i]), available };
}
