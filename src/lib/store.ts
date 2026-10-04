// Palaces live on this device only, in the browser's IndexedDB (via idb-keyval):
//   palace:<id> → the palace (stops, scenes, walks)      photo:<id> → the shrunk photo's bytes (own photos only)
// If the browser won't store anything (private mode, full disk), palaces still work for this visit.
import { createStore, del, entries, get, set, type UseStore } from "idb-keyval";
import type { Palace, Walk } from "../../shared/types";

export type Loaded = { palace: Palace; photoUrl: string; saved: boolean };
type StoredPhoto = { type: string; data: ArrayBuffer };

let db: UseStore | null = null;
const database = () => (db ??= createStore("loci", "palaces"));
const memory = new Map<string, Loaded>();

export function photoUrlFor(palace: Palace, ownUrl?: string): string {
  return palace.room.kind === "example" ? `/rooms/${palace.room.id}.jpg` : (ownUrl ?? "");
}

export async function savePalace(palace: Palace, photo?: { blob: Blob; url: string }): Promise<boolean> {
  let saved = false;
  try {
    if (photo) await set(`photo:${palace.id}`, { type: photo.blob.type || "image/jpeg", data: await photo.blob.arrayBuffer() } satisfies StoredPhoto, database());
    await set(`palace:${palace.id}`, palace, database());
    saved = true;
  } catch {
    saved = false; // kept for this visit only
  }
  memory.set(palace.id, { palace, photoUrl: photoUrlFor(palace, photo?.url), saved });
  return saved;
}

export function peekPalace(id: string): Loaded | null {
  return memory.get(id) ?? null;
}

async function readStored(id: string, palace: Palace): Promise<Loaded | null> {
  if (palace.room.kind === "example") return { palace, photoUrl: photoUrlFor(palace), saved: true };
  const photo = await get<StoredPhoto>(`photo:${id}`, database());
  if (!photo) return null;
  return { palace, photoUrl: URL.createObjectURL(new Blob([photo.data], { type: photo.type })), saved: true };
}

export async function loadPalace(id: string): Promise<Loaded | null> {
  const cached = memory.get(id);
  if (cached) return cached;
  try {
    const palace = await get<Palace>(`palace:${id}`, database());
    if (!palace) return null;
    const loaded = await readStored(id, palace);
    if (loaded) memory.set(id, loaded);
    return loaded;
  } catch {
    return null;
  }
}

/** Every palace on this device, newest first. */
export async function listPalaces(): Promise<Loaded[]> {
  const found = new Map<string, Loaded>(memory);
  try {
    for (const [key, value] of await entries<string, Palace>(database())) {
      if (typeof key !== "string" || !key.startsWith("palace:")) continue;
      const id = key.slice("palace:".length);
      if (found.has(id)) continue;
      const loaded = await readStored(id, value);
      if (loaded) {
        memory.set(id, loaded);
        found.set(id, loaded);
      }
    }
  } catch {
    // Storage unavailable: only this visit's palaces.
  }
  return [...found.values()].sort((a, b) => b.palace.createdAt - a.palace.createdAt);
}

/** Adds a finished walk, or (after a retry) updates the latest one. */
export async function saveWalk(id: string, walk: Walk, replaceLast = false): Promise<Palace | null> {
  const entry = memory.get(id) ?? (await loadPalace(id));
  if (!entry) return null;
  const walks = replaceLast && entry.palace.walks.length ? [...entry.palace.walks.slice(0, -1), walk] : [...entry.palace.walks, walk];
  const palace = { ...entry.palace, walks };
  memory.set(id, { ...entry, palace });
  try {
    if (entry.saved) await set(`palace:${id}`, palace, database());
  } catch {
    // The walk still shows now; it just won't be kept.
  }
  return palace;
}

export async function deletePalace(id: string): Promise<void> {
  const entry = memory.get(id);
  if (entry?.photoUrl.startsWith("blob:")) URL.revokeObjectURL(entry.photoUrl);
  memory.delete(id);
  try {
    await del(`palace:${id}`, database());
    await del(`photo:${id}`, database());
  } catch {
    // nothing stored
  }
}

/** For tests: forget this visit's cache so reads come from storage. */
export function forgetMemory() {
  memory.clear();
}
