// Palaces kept for this visit. (Saving to the device's IndexedDB is added in the "Palaces stay on your device" step.)
import type { Palace, Walk } from "../../shared/types";

export type Loaded = { palace: Palace; photoUrl: string };

const memory = new Map<string, Loaded>();

export function photoUrlFor(palace: Palace, ownUrl?: string): string {
  return palace.room.kind === "example" ? `/rooms/${palace.room.id}.jpg` : (ownUrl ?? "");
}

export async function savePalace(palace: Palace, photo?: { blob: Blob; url: string }): Promise<boolean> {
  memory.set(palace.id, { palace, photoUrl: photoUrlFor(palace, photo?.url) });
  return true;
}

export async function loadPalace(id: string): Promise<Loaded | null> {
  return memory.get(id) ?? null;
}

export function peekPalace(id: string): Loaded | null {
  return memory.get(id) ?? null;
}

export async function saveWalk(id: string, walk: Walk, replaceLast = false): Promise<Palace | null> {
  const entry = memory.get(id);
  if (!entry) return null;
  const walks = replaceLast && entry.palace.walks.length ? [...entry.palace.walks.slice(0, -1), walk] : [...entry.palace.walks, walk];
  const palace = { ...entry.palace, walks };
  memory.set(id, { ...entry, palace });
  return palace;
}
