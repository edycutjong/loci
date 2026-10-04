// Calls to the AI providers, and the ladder that falls back from one model to the next.
// Used only by the server helpers in api/ — keys never reach the browser.
import { parseModelJson } from "./validate.js";

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

/** Tokens one answered model call used, as its provider counted them. `cached` is the part of `input` billed at the
 *  provider's cache rate; `output` includes any reasoning tokens. */
export type Usage = { model: string; input: number; cached: number; output: number };

/** A model's answer: its JSON (undefined when the text wasn't JSON) and the provider's token counts, if it sent them. */
export type ModelAnswer = { json: unknown; tokens: Omit<Usage, "model"> | null };

const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

// Text that isn't JSON is an unusable answer, not a crash: the ladder moves on and the tokens it cost are still counted.
function readJson(text: string): unknown {
  try {
    return parseModelJson(text);
  } catch {
    return undefined;
  }
}

export async function geminiJson(model: string, parts: GeminiPart[], schema: object, key: string, signal: AbortSignal): Promise<ModelAnswer> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.4 },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.find((p: { text?: unknown }) => typeof p.text === "string")?.text;
  if (typeof text !== "string") throw new Error("empty answer");
  const u = body?.usageMetadata;
  return {
    json: readJson(text),
    tokens: u ? { input: count(u.promptTokenCount), cached: count(u.cachedContentTokenCount), output: count(u.candidatesTokenCount) + count(u.thoughtsTokenCount) } : null,
  };
}

export async function deepseekJson(text: string, key: string, signal: AbortSignal, imageBase64?: string): Promise<ModelAnswer> {
  const content: object[] = [{ type: "text", text }];
  if (imageBase64) content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } });
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "deepseek-flash",
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const answer = body?.choices?.[0]?.message?.content;
  if (typeof answer !== "string") throw new Error("empty answer");
  const u = body?.usage;
  return {
    json: readJson(answer),
    tokens: u ? { input: count(u.prompt_tokens), cached: count(u.prompt_cache_hit_tokens), output: count(u.completion_tokens) } : null,
  };
}

export type Attempt<T> = {
  name: string;
  /** This attempt's own time limit. */
  ms: number;
  key: () => string | undefined;
  call: (key: string, signal: AbortSignal) => Promise<ModelAnswer>;
  /** Turns the raw answer into a usable value, or null to try the next model. */
  accept: (raw: unknown) => T | null;
};

/** The answer, which model gave it and how long that model took; why earlier models were passed over; and the
 *  tokens of every model that answered, the unusable answers included. */
export type LadderResult<T> = { value: T; model: string; ms: number; tried: string[]; usage: Usage[] };

/** Tries each attempt in order within one overall budget; providers without a key are skipped. */
export async function runLadder<T>(attempts: Attempt<T>[], budgetMs: number): Promise<LadderResult<T>> {
  const started = Date.now();
  const deadline = started + budgetMs;
  const tried: string[] = [];
  const usage: Usage[] = [];
  for (const attempt of attempts) {
    const key = attempt.key();
    if (!key) continue;
    const left = deadline - Date.now();
    if (left < 3_000) break;
    const t0 = Date.now();
    try {
      const answer = await attempt.call(key, AbortSignal.timeout(Math.min(attempt.ms, left)));
      if (answer.tokens) usage.push({ model: attempt.name, ...answer.tokens });
      const value = attempt.accept(answer.json);
      if (value !== null) return { value, model: attempt.name, ms: Date.now() - t0, tried, usage };
      tried.push(`${attempt.name}: unusable answer`);
    } catch (err) {
      const e = err as Error;
      tried.push(`${attempt.name}: ${e.name === "TimeoutError" ? "timed out" : e.message}`);
    }
  }
  throw new Error(tried.length ? tried.join("; ") : "no AI provider key configured");
}

/** Small JSON response helper for the Web-standard handlers. */
export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
