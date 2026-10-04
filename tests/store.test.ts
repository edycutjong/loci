import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { entries } from "idb-keyval";
import { createStore } from "idb-keyval";
import { deletePalace, forgetMemory, listPalaces, loadPalace, savePalace, saveWalk } from "../src/lib/store";
import type { Palace } from "../shared/types";

const palace = (id: string, createdAt: number, room: Palace["room"] = { kind: "photo" }): Palace => ({
  id,
  createdAt,
  title: "Olfactory → Optic",
  room,
  photo: { width: 1280, height: 853 },
  stops: [{ item: { text: "Olfactory", accepts: [] }, anchor: { label: "red kettle", box: [1, 2, 300, 400] }, scene: "A scene.", soundsLike: "" }],
  made: { anchors: "test", scenes: "test", prepared: false },
  walks: [],
});

const photo = () => {
  const blob = new Blob([new Uint8Array([255, 216, 255, 0, 1, 2])], { type: "image/jpeg" });
  return { blob, url: "blob:test" };
};

describe("palace store (IndexedDB)", () => {
  beforeEach(async () => {
    for (const p of await listPalaces()) await deletePalace(p.palace.id);
    forgetMemory();
  });

  it("saves a palace and its photo, and reads them back after the page is gone", async () => {
    expect(await savePalace(palace("a", 1), photo())).toBe(true);
    forgetMemory(); // as if the tab were closed and opened again
    const loaded = await loadPalace("a");
    expect(loaded?.palace.title).toBe("Olfactory → Optic");
    expect(loaded?.photoUrl.startsWith("blob:")).toBe(true);
    expect(loaded?.saved).toBe(true);
  });

  it("lists palaces newest first, including example rooms (photo from the site)", async () => {
    await savePalace(palace("old", 1), photo());
    await savePalace(palace("new", 2, { kind: "example", id: "kos" }));
    forgetMemory();
    const list = await listPalaces();
    expect(list.map((l) => l.palace.id)).toEqual(["new", "old"]);
    expect(list[0].photoUrl).toBe("/rooms/kos.jpg");
  });

  it("adds walks, and a retry updates the latest walk instead of adding one", async () => {
    await savePalace(palace("w", 1), photo());
    await saveWalk("w", { at: 1, firstTry: [false], afterRetry: null, learnMs: 1000, recallMs: 2000 });
    await saveWalk("w", { at: 2, firstTry: [false], afterRetry: [true], learnMs: 1000, recallMs: 2000 }, true);
    forgetMemory();
    const walks = (await loadPalace("w"))!.palace.walks;
    expect(walks).toHaveLength(1);
    expect(walks[0].afterRetry).toEqual([true]);
  });

  it("deleting removes both the palace and its photo", async () => {
    await savePalace(palace("d", 1), photo());
    await deletePalace("d");
    forgetMemory();
    expect(await loadPalace("d")).toBeNull();
    const keys = (await entries(createStore("loci", "palaces"))).map(([k]) => String(k));
    expect(keys.filter((k) => k.endsWith(":d"))).toEqual([]);
  });
});
