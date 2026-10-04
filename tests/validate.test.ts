import { describe, expect, it } from "vitest";
import { parseModelJson, validateAnchors, validateScenes } from "../shared/validate";

describe("validateAnchors", () => {
  it("keeps well-formed objects in order, from a bare array or {anchors}", () => {
    const raw = [{ label: " red  kettle ", box_2d: [468, 908, 542, 998] }, { label: "globe", box_2d: [256, 913, 349, 1000] }];
    expect(validateAnchors(raw)).toEqual([
      { label: "red kettle", box: [468, 908, 542, 998] },
      { label: "globe", box: [256, 913, 349, 1000] },
    ]);
    expect(validateAnchors({ anchors: raw })).toHaveLength(2);
  });

  it("drops malformed boxes instead of repairing them", () => {
    const raw = [
      { label: "inverted", box_2d: [500, 500, 400, 600] },
      { label: "out of range", box_2d: [0, 0, 1001, 100] },
      { label: "three numbers", box_2d: [0, 0, 100] },
      { label: "text", box_2d: ["0", "0", "100", "100"] },
      { label: "speck", box_2d: [0, 0, 10, 10] }, // 0.01% of the photo
      { label: "the whole room", box_2d: [0, 0, 1000, 1000] },
      { label: "", box_2d: [0, 0, 300, 300] },
      { box_2d: [0, 0, 300, 300] },
      { label: "fine", box_2d: [100, 100, 300, 300] },
    ];
    expect(validateAnchors(raw).map((x) => x.label)).toEqual(["fine"]);
  });

  it("returns nothing for nonsense and caps at 16", () => {
    expect(validateAnchors("no")).toEqual([]);
    expect(validateAnchors(null)).toEqual([]);
    const many = Array.from({ length: 20 }, (_, i) => ({ label: `o${i}`, box_2d: [100, 10 + i * 40, 200, 40 + i * 40] }));
    expect(validateAnchors(many)).toHaveLength(16);
  });
});

describe("validateScenes", () => {
  const scene = (stop: number) => ({ stop, scene: `Scene ${stop}.`, soundsLike: stop === 2 ? "truck-lear" : "" });

  it("returns exactly one scene per stop, in stop order", () => {
    expect(validateScenes([scene(2), scene(1), scene(3)], 3)).toEqual([
      { scene: "Scene 1.", soundsLike: "" },
      { scene: "Scene 2.", soundsLike: "truck-lear" },
      { scene: "Scene 3.", soundsLike: "" },
    ]);
    expect(validateScenes({ scenes: [scene(1), scene(2)] }, 2)).toHaveLength(2);
  });

  it("refuses a missing, empty or duplicated scene so the next model is asked", () => {
    expect(validateScenes([scene(1), scene(2)], 3)).toBeNull();
    expect(validateScenes([scene(1), { stop: 2, scene: "  ", soundsLike: "" }], 2)).toBeNull();
    expect(validateScenes([scene(1), scene(1)], 2)).toBeNull();
    expect(validateScenes([scene(1), { stop: 2, scene: "x".repeat(400), soundsLike: "" }], 2)).toBeNull();
  });
});

describe("parseModelJson", () => {
  it("tolerates code fences", () => {
    expect(parseModelJson('```json\n{"scenes": []}\n```')).toEqual({ scenes: [] });
  });
});
