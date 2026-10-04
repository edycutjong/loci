// Checks what an AI model sent back before anything uses it. Malformed parts are dropped, never repaired.
import type { Anchor, Box, Scene } from "./types.js";

export const MAX_ANCHORS = 16;
const MIN_AREA = 0.0015; // share of the photo; smaller boxes are specks
const MAX_AREA = 0.6; // larger boxes are "the room", not an object
const MAX_LABEL = 40;
const MAX_SCENE = 320;
const MAX_SOUNDS_LIKE = 48;

/** Reads a model's JSON text: tolerates code fences around it. */
export function parseModelJson(text: string): unknown {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(clean);
}

const listFrom = (raw: unknown, key: string): unknown[] => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>)[key])) return (raw as Record<string, unknown[]>)[key];
  return [];
};

function toBox(value: unknown): Box | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  if (!value.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1000)) return null;
  const [ymin, xmin, ymax, xmax] = value as number[];
  if (ymin >= ymax || xmin >= xmax) return null;
  const area = ((ymax - ymin) * (xmax - xmin)) / 1_000_000;
  if (area < MIN_AREA || area > MAX_AREA) return null;
  return [ymin, xmin, ymax, xmax];
}

/** `[{label, box_2d}]` or `{anchors: [...]}` → up to 16 well-formed objects, in the model's order. */
export function validateAnchors(raw: unknown): Anchor[] {
  const out: Anchor[] = [];
  for (const entry of listFrom(raw, "anchors")) {
    if (out.length >= MAX_ANCHORS) break;
    if (!entry || typeof entry !== "object") continue;
    const { label, box_2d, box } = entry as Record<string, unknown>;
    const clean = typeof label === "string" ? label.replace(/\s+/g, " ").trim() : "";
    const checked = toBox(box_2d ?? box);
    if (!clean || clean.length > MAX_LABEL || !checked) continue;
    out.push({ label: clean, box: checked });
  }
  return out;
}

/**
 * `[{stop, scene, soundsLike}]` or `{scenes: [...]}` → exactly `count` scenes in stop order, or null when any is
 * missing or empty (the caller then asks the next model).
 */
export function validateScenes(raw: unknown, count: number): Scene[] | null {
  const entries = listFrom(raw, "scenes").filter((e): e is Record<string, unknown> => !!e && typeof e === "object");
  if (entries.length !== count) return null;
  const numbered = entries.every((e) => typeof e.stop === "number");
  const ordered = numbered ? [...entries].sort((a, b) => (a.stop as number) - (b.stop as number)) : entries;
  if (numbered && ordered.some((e, i) => e.stop !== i + 1)) return null;
  const scenes: Scene[] = [];
  for (const e of ordered) {
    const scene = typeof e.scene === "string" ? e.scene.replace(/\s+/g, " ").trim() : "";
    if (!scene || scene.length > MAX_SCENE) return null;
    const sounds = typeof e.soundsLike === "string" ? e.soundsLike.replace(/\s+/g, " ").trim() : "";
    scenes.push({ scene, soundsLike: sounds.length <= MAX_SOUNDS_LIKE ? sounds : "" });
  }
  return scenes;
}
