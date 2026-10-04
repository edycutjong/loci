// POST /api/scenes — object + item pairs in (names only, never the photo), one vivid scene per stop out.
import { SCENE_JSON_SUFFIX, SCENE_SCHEMA, scenePrompt, type ScenePair } from "../shared/prompts.js";
import { deepseekJson, geminiJson, json, runLadder, type Attempt } from "../shared/providers.js";
import { validateScenes } from "../shared/validate.js";
import type { Scene } from "../shared/types.js";

const BUDGET_MS = 26_000; // under the function's 30 s limit
const MAX_STOPS = 12;
const MAX_TEXT = 60;

function readPairs(raw: unknown): ScenePair[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_STOPS) return null;
  const pairs: ScenePair[] = [];
  for (const entry of raw) {
    const { object, item } = (entry ?? {}) as Record<string, unknown>;
    if (typeof object !== "string" || typeof item !== "string") return null;
    const o = object.trim();
    const i = item.trim();
    if (!o || !i || o.length > MAX_TEXT || i.length > MAX_TEXT) return null;
    pairs.push({ object: o, item: i });
  }
  return pairs;
}

function attempts(pairs: ScenePair[]): Attempt<Scene[]>[] {
  const prompt = scenePrompt(pairs);
  const accept = (raw: unknown) => validateScenes(raw, pairs.length);
  const gemini = (model: string, ms: number): Attempt<Scene[]> => ({
    name: model,
    ms,
    key: () => process.env.GEMINI_API_KEY,
    call: (key, signal) => geminiJson(model, [{ text: prompt }], SCENE_SCHEMA, key, signal),
    accept,
  });
  // Ordered by the planning spike: DeepSeek wrote vivid scenes in well under a second; Gemini 3.8 Flash was as
  // vivid but slower; Flash-Lite was blander, so it is the last resort.
  return [
    { name: "deepseek-flash", ms: 15_000, key: () => process.env.DEEPSEEK_API_KEY, call: (key, signal) => deepseekJson(prompt + SCENE_JSON_SUFFIX, key, signal), accept },
    gemini("gemini-3.8-flash", 15_000),
    gemini("gemini-3.1-flash-lite", 12_000),
  ];
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.GEMINI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    return json(500, { error: "The server has no AI key set (GEMINI_API_KEY or DEEPSEEK_API_KEY)." });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "The request must be JSON." });
  }
  const pairs = readPairs((body as Record<string, unknown> | null)?.stops);
  if (!pairs) return json(400, { error: `Send 1 to ${MAX_STOPS} stops, each {"object", "item"} of up to ${MAX_TEXT} characters.` });

  try {
    const { value, model, ms } = await runLadder(attempts(pairs), BUDGET_MS);
    return json(200, { scenes: value, model, ms });
  } catch (err) {
    return json(502, { error: "Couldn't reach the AI to write your scenes.", detail: String((err as Error).message) });
  }
}

export function GET(): Response {
  return json(405, { error: "Use POST with a JSON body: {\"stops\": [{\"object\": \"red kettle\", \"item\": \"Olfactory\"}]}." });
}
