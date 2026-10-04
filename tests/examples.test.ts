import { describe, expect, it } from "vitest";
import { parseList } from "../shared/list";
import { countUsable, planRoute } from "../shared/route";
import { EXAMPLE_ROOMS, preparedPalace } from "../src/examples/examples";
import { EXAMPLE_LISTS } from "../src/examples/lists";

describe("prepared examples (made by scripts/prebuild-examples.mjs from the real helpers)", () => {
  it("has three AI-generated rooms with at least 12 usable stops each", () => {
    expect(EXAMPLE_ROOMS.map((r) => r.id)).toEqual(["kos", "studio", "kitchen"]);
    for (const room of EXAMPLE_ROOMS) {
      expect(countUsable(room.anchors, room.width, room.height), room.id).toBeGreaterThanOrEqual(12);
      expect(room.model).toMatch(/^gemini|^deepseek/);
    }
  });

  it("has a full scene set for every room × list, each naming its item", () => {
    for (const room of EXAMPLE_ROOMS) {
      for (const list of EXAMPLE_LISTS) {
        const items = parseList(list.text).items;
        const prepared = preparedPalace(room.id, list.id);
        expect(prepared, `${room.id}:${list.id}`).not.toBeNull();
        expect(prepared!.scenes).toHaveLength(items.length);
        prepared!.scenes.forEach((s, i) => expect(s.scene.toLowerCase(), `${room.id}:${list.id} stop ${i + 1}`).toContain(items[i].text.toLowerCase()));
      }
    }
  });

  it("stores exactly the route the app computes, so the instant path is always taken", () => {
    for (const room of EXAMPLE_ROOMS) {
      for (const list of EXAMPLE_LISTS) {
        const items = parseList(list.text).items;
        const plan = planRoute(room.anchors, items.length, room.width, room.height);
        expect(preparedPalace(room.id, list.id)!.anchors, `${room.id}:${list.id}`).toEqual(plan.stops);
      }
    }
  });
});
