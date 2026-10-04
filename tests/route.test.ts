import { describe, expect, it } from "vitest";
import { boxCentre, boxToPixels, chooseAnchors, countUsable, planRoute, routeLength, shortestRoute, type Point } from "../shared/route";
import type { Anchor, Box } from "../shared/types";

const a = (label: string, box: Box): Anchor => ({ label, box });

describe("boxToPixels", () => {
  it("reads [ymin, xmin, ymax, xmax] with y first, on a non-square photo", () => {
    // 1280 wide × 853 high: x scales by the width, y by the height.
    const r = boxToPixels([100, 200, 300, 600], 1280, 853);
    expect(r.x).toBeCloseTo(256);
    expect(r.y).toBeCloseTo(85.3);
    expect(r.width).toBeCloseTo(512);
    expect(r.height).toBeCloseTo(170.6);
    const c = boxCentre([100, 200, 300, 600], 1280, 853);
    expect(c.x).toBeCloseTo(512);
    expect(c.y).toBeCloseTo(170.6);
  });

  it("does not swap x and y on a portrait photo", () => {
    expect(boxCentre([0, 0, 1000, 500], 853, 1280)).toEqual({ x: 213.25, y: 640 });
  });
});

describe("chooseAnchors", () => {
  const W = 1000;
  const H = 1000;

  it("keeps the model's order and stops at n", () => {
    const list = [a("lamp", [0, 0, 100, 100]), a("clock", [0, 800, 100, 900]), a("rug", [800, 400, 900, 500])];
    expect(chooseAnchors(list, 2, W, H).map((x) => x.label)).toEqual(["lamp", "clock"]);
  });

  it("drops a box overlapping a kept one by more than half (IoU > 0.5)", () => {
    const list = [a("bed", [100, 100, 500, 500]), a("bed again", [110, 110, 510, 510]), a("chair", [600, 600, 900, 900])];
    expect(chooseAnchors(list, 5, W, H).map((x) => x.label)).toEqual(["bed", "chair"]);
  });

  it("drops crowded centres closer than 7% of the diagonal, but keeps two separate chairs", () => {
    const diag = Math.hypot(W, H); // 1414; 7% = 99
    const list = [
      a("chair", [400, 100, 500, 200]), // centre (150, 450)
      a("mug", [400, 150, 480, 230]), // centre (190, 440): 41 px away -> crowded
      a("chair", [400, 700, 500, 800]), // same name, far away -> a second, separate chair
    ];
    expect(0.07 * diag).toBeCloseTo(98.99, 1);
    expect(chooseAnchors(list, 5, W, H).map((x) => `${x.label}@${x.box[1]}`)).toEqual(["chair@100", "chair@700"]);
  });

  it("counts usable stops for the 'found 8 good spots' message", () => {
    const list = [a("a", [0, 0, 50, 50]), a("b", [0, 20, 50, 70]), a("c", [500, 500, 550, 550])];
    expect(countUsable(list, W, H)).toBe(2);
  });
});

describe("shortestRoute", () => {
  it("starts at the leftmost point and ends at the rightmost", () => {
    const pts: Point[] = [{ x: 50, y: 50 }, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 60, y: 90 }];
    const order = shortestRoute(pts);
    expect(order[0]).toBe(1);
    expect(order[order.length - 1]).toBe(2);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
  });

  it("is never longer than sorting left to right, and avoids the zigzag", () => {
    // Two rows of points: a left-to-right sort zigzags between rows; the shortest path sweeps them.
    const pts: Point[] = [];
    for (let i = 0; i < 6; i++) pts.push({ x: i * 100, y: i % 2 === 0 ? 0 : 400 });
    const xsort = pts.map((_, i) => i);
    const best = shortestRoute(pts);
    expect(routeLength(pts, best)).toBeLessThan(routeLength(pts, xsort));
  });

  it("finds the true optimum on a small case (brute force check)", () => {
    const pts: Point[] = [{ x: 0, y: 50 }, { x: 30, y: 0 }, { x: 35, y: 100 }, { x: 70, y: 10 }, { x: 72, y: 95 }, { x: 100, y: 50 }];
    const permutations = (rest: number[]): number[][] => (rest.length <= 1 ? [rest] : rest.flatMap((x) => permutations(rest.filter((y) => y !== x)).map((p) => [x, ...p])));
    const middle = [1, 2, 3, 4];
    const bruteBest = Math.min(...permutations(middle).map((p) => routeLength(pts, [0, ...p, 5])));
    expect(routeLength(pts, shortestRoute(pts))).toBeCloseTo(bruteBest, 6);
  });

  it("handles 12 points quickly", () => {
    const pts = Array.from({ length: 12 }, (_, i) => ({ x: (i * 97) % 1000, y: (i * 373) % 1000 }));
    const t0 = performance.now();
    const order = shortestRoute(pts);
    expect(performance.now() - t0).toBeLessThan(200);
    expect(new Set(order).size).toBe(12);
  });

  it("handles tiny inputs", () => {
    expect(shortestRoute([])).toEqual([]);
    expect(shortestRoute([{ x: 5, y: 5 }])).toEqual([0]);
    expect(shortestRoute([{ x: 9, y: 0 }, { x: 1, y: 0 }])).toEqual([1, 0]);
  });
});

describe("planRoute", () => {
  it("puts item k on stop k along the walking order, and reports a shortage", () => {
    const anchors = [a("right", [100, 800, 200, 900]), a("left", [100, 0, 200, 100]), a("middle", [700, 400, 800, 500])];
    const plan = planRoute(anchors, 3, 1000, 1000);
    expect(plan.stops.map((s) => s.label)).toEqual(["left", "middle", "right"]);
    expect(plan.available).toBe(3);
    expect(planRoute(anchors, 5, 1000, 1000).available).toBe(3);
  });
});
