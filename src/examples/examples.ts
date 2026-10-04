// Example rooms and the palaces prepared from them by the real helpers (scripts/prebuild-examples.mjs).
import type { Anchor, ExampleRoomId, Scene } from "../../shared/types";
import rooms from "./rooms.json";
import scenes from "./scenes.json";

export type ExampleRoom = { id: ExampleRoomId; name: string; width: number; height: number; anchors: Anchor[]; model: string; date: string };
type Prepared = { anchors: Anchor[]; scenes: Scene[]; model: string; date: string };

const ORDER: ExampleRoomId[] = ["kos", "studio", "kitchen"];
const roomTable = rooms as unknown as Record<ExampleRoomId, Omit<ExampleRoom, "id">>;
const sceneTable = scenes as unknown as Record<string, Prepared>;

export const EXAMPLE_ROOMS: ExampleRoom[] = ORDER.map((id) => ({ id, ...roomTable[id] }));

export const exampleRoom = (id: ExampleRoomId) => EXAMPLE_ROOMS.find((r) => r.id === id)!;

export function preparedPalace(roomId: ExampleRoomId, listId: string): Prepared | null {
  return sceneTable[`${roomId}:${listId}`] ?? null;
}
