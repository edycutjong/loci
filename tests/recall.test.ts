import { describe, expect, it } from "vitest";
import { answer, count, currentStop, fold, resultLine, skipTo, startWalk } from "../src/lib/recall";
import { formatDuration } from "../src/lib/time";

describe("a full walk", () => {
  it("asks every stop in order and ends on the last answer", () => {
    let w = startWalk(3, 1000);
    expect(currentStop(w)).toBe(0);
    w = answer(w, true, 2000);
    w = answer(w, false, 3000);
    expect(currentStop(w)).toBe(2);
    expect(w.endedAt).toBeNull();
    w = answer(w, true, 4000);
    expect(currentStop(w)).toBeNull();
    expect(w.endedAt).toBe(4000);
    expect(w.outcomes).toEqual(["right", "wrong", "right"]);
    expect(answer(w, true, 5000)).toBe(w); // nothing left to answer
  });

  it("folds into a first-try result with the recall time", () => {
    let w = startWalk(3, 1000);
    for (const ok of [true, false, true]) w = answer(w, ok, 61_000);
    const r = fold(null, w, 222_000);
    expect(r.firstTry).toEqual([true, false, true]);
    expect(r.afterRetry).toBeNull();
    expect(r.recallMs).toBe(60_000);
    expect(count(r.firstTry)).toBe(2);
  });
});

describe("retrying the misses", () => {
  it("asks only the missed stops and never changes the first-try count", () => {
    let w = startWalk(4, 0);
    for (const ok of [true, false, true, false]) w = answer(w, ok, 10);
    const first = fold(null, w, null);

    let retry = startWalk(4, 20, [1, 3]);
    expect(retry.kind).toBe("retry");
    expect(currentStop(retry)).toBe(1);
    retry = answer(retry, true, 30);
    retry = answer(retry, false, 40);
    const second = fold(first, retry, null);
    expect(second.firstTry).toEqual([true, false, true, false]);
    expect(second.afterRetry).toEqual([true, true, true, false]);

    let again = startWalk(4, 50, [3]);
    again = answer(again, true, 60);
    expect(fold(second, again, null).afterRetry).toEqual([true, true, true, true]);
  });
});

describe("voice look-ahead", () => {
  it("marks skipped stops missed and the named stop right", () => {
    let w = startWalk(5, 0);
    w = answer(w, true, 1);
    w = skipTo(w, 3, 2);
    expect(w.outcomes).toEqual(["right", "wrong", "wrong", "right", "pending"]);
    expect(currentStop(w)).toBe(4);
  });
});

describe("resultLine", () => {
  it("is one plain line with the numbers that matter", () => {
    const r = { firstTry: [true, true, false], afterRetry: [true, true, true], learnMs: 222_000, recallMs: 65_000, at: 0 };
    expect(resultLine(r, 3, new Date("2026-10-04T12:00:00Z"), formatDuration)).toBe("Loci · 3 items · first try 2/3 · after retry 3/3 · learn 3:42 · recall 1:05 · 2026-10-04");
  });
});

describe("formatDuration", () => {
  it("reads like a clock", () => {
    expect(formatDuration(9_000)).toBe("0:09");
    expect(formatDuration(222_000)).toBe("3:42");
    expect(formatDuration(3_723_000)).toBe("1:02:03");
  });
});
