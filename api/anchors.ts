// POST /api/anchors — room photo in, the most memorable objects out (label + box), most memorable first.
// Runs as a Vercel function in production and through the Vite dev bridge locally (vite.config.ts).
import { ANCHOR_JSON_SUFFIX, ANCHOR_PROMPT, ANCHOR_SCHEMA } from "../shared/prompts.js";
import { deepseekJson, geminiJson, json, runLadder, type Attempt } from "../shared/providers.js";
import { validateAnchors } from "../shared/validate.js";
import type { Anchor } from "../shared/types.js";

const MAX_BODY_CHARS = 4_000_000; // a 1280 px JPEG is ~0.4 MB as base64; Vercel's body limit is 4.5 MB
const BUDGET_MS = 55_000; // under the function's 60 s limit and the browser's 75 s wait
const MIN_USEFUL = 3;

const usable = (raw: unknown): Anchor[] | null => {
  const anchors = validateAnchors(raw);
  return anchors.length >= MIN_USEFUL ? anchors : null;
};

function attempts(image: string): Attempt<Anchor[]>[] {
  const parts = [{ inline_data: { mime_type: "image/jpeg", data: image } }, { text: ANCHOR_PROMPT }];
  const gemini = (model: string, ms: number): Attempt<Anchor[]> => ({
    name: model,
    ms,
    key: () => process.env.GEMINI_API_KEY,
    call: (key, signal) => geminiJson(model, parts, ANCHOR_SCHEMA, key, signal),
    accept: usable,
  });
  // Ordered by box accuracy measured in the planning spike: Gemini draws the tightest boxes;
  // DeepSeek is fast but looser, so it is the last resort.
  return [
    gemini(process.env.GEMINI_MODEL || "gemini-3.8-flash", 15_000),
    gemini("gemini-3.5-flash", 20_000),
    gemini("gemini-3.1-flash-lite", 12_000),
    {
      name: "deepseek-flash",
      ms: 15_000,
      key: () => process.env.DEEPSEEK_API_KEY,
      call: (key, signal) => deepseekJson(ANCHOR_PROMPT + ANCHOR_JSON_SUFFIX, key, signal, image),
      accept: usable,
    },
  ];
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.GEMINI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    return json(500, { error: "The server has no AI key set (GEMINI_API_KEY or DEEPSEEK_API_KEY)." });
  }
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return json(413, { error: "That photo is too large." });

  let image: unknown;
  try {
    ({ image } = JSON.parse(text));
  } catch {
    return json(400, { error: "The request must be JSON." });
  }
  if (typeof image !== "string" || image.length < 100) return json(400, { error: "Missing photo." });
  const base64 = image.replace(/^data:image\/[a-z+]+;base64,/, "");

  try {
    const { value, model, ms } = await runLadder(attempts(base64), BUDGET_MS);
    return json(200, { anchors: value, model, ms });
  } catch (err) {
    return json(502, { error: "Couldn't reach the AI to look at your photo.", detail: String((err as Error).message) });
  }
}

export function GET(): Response {
  return json(405, { error: "Use POST with a JSON body: {\"image\": \"<base64 JPEG>\"}." });
}
