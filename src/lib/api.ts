// Talks to the two server helpers. Answers are checked again here, so a bad response can't reach the screen.
import type { ScenePair } from "../../shared/prompts";
import type { Anchor, Scene } from "../../shared/types";
import { validateAnchors, validateScenes } from "../../shared/validate";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function post(path: string, body: unknown, timeoutMs: number): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = (err as Error).name === "TimeoutError";
    throw new ApiError(timedOut ? "The AI took too long to answer." : "No connection to the server.", 0);
  }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !data) throw new ApiError(typeof data?.error === "string" ? data.error : `The server answered ${res.status}.`, res.status);
  return data;
}

export type AnchorsAnswer = { anchors: Anchor[]; model: string };

export async function findAnchors(imageBase64: string): Promise<AnchorsAnswer> {
  const data = await post("/api/anchors", { image: imageBase64 }, 75_000);
  const anchors = validateAnchors(data.anchors);
  if (anchors.length === 0) throw new ApiError("The AI didn't find any objects in this photo.", 200);
  return { anchors, model: String(data.model ?? "unknown") };
}

export type ScenesAnswer = { scenes: Scene[]; model: string };

export async function writeScenes(stops: ScenePair[]): Promise<ScenesAnswer> {
  const data = await post("/api/scenes", { stops }, 60_000);
  const scenes = validateScenes(data.scenes, stops.length);
  if (!scenes) throw new ApiError("The scenes came back incomplete.", 200);
  return { scenes, model: String(data.model ?? "unknown") };
}
