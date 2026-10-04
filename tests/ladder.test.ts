import { describe, expect, it } from "vitest";
import { runLadder, type Attempt, type ModelAnswer } from "../shared/providers";

// The model ladder in shared/providers.ts, with stand-in models: no network, no keys.
const atLeast3 = (raw: unknown) => (Array.isArray(raw) && raw.length >= 3 ? (raw as number[]) : null);
/** A stand-in model; `key: null` = its provider has no key set. */
const model = (name: string, answer: ModelAnswer | Error, key: string | null = "key"): Attempt<number[]> => ({
  name,
  ms: 1_000,
  key: () => key ?? undefined,
  call: async () => {
    if (answer instanceof Error) throw answer;
    return answer;
  },
  accept: atLeast3,
});

describe("runLadder", () => {
  it("answers with the first usable model and says why the earlier ones were passed over", async () => {
    const result = await runLadder(
      [
        model("quota-model", new Error("HTTP 429")),
        model("no-key-model", { json: [1, 2, 3], tokens: null }, null),
        model("short-model", { json: [1], tokens: { input: 900, cached: 0, output: 40 } }),
        model("good-model", { json: [1, 2, 3, 4], tokens: { input: 1200, cached: 128, output: 300 } }),
        model("never-asked", { json: [9, 9, 9], tokens: null }),
      ],
      10_000,
    );
    expect(result.value).toEqual([1, 2, 3, 4]);
    expect(result.model).toBe("good-model");
    // A provider without a key is skipped silently; it is not a failure.
    expect(result.tried).toEqual(["quota-model: HTTP 429", "short-model: unusable answer"]);
  });

  it("reports the tokens of every model that answered, the unusable answer included, as each provider counted them", async () => {
    const result = await runLadder(
      [
        model("short-model", { json: [1], tokens: { input: 900, cached: 0, output: 40 } }),
        model("not-json-model", { json: undefined, tokens: { input: 850, cached: 0, output: 12 } }),
        model("good-model", { json: [1, 2, 3], tokens: { input: 1200, cached: 128, output: 300 } }),
      ],
      10_000,
    );
    expect(result.usage).toEqual([
      { model: "short-model", input: 900, cached: 0, output: 40 },
      { model: "not-json-model", input: 850, cached: 0, output: 12 },
      { model: "good-model", input: 1200, cached: 128, output: 300 },
    ]);
  });

  it("fails with every reason when no model gives a usable answer, and with a plain reason when no key is set", async () => {
    await expect(runLadder([model("a", new Error("HTTP 503")), model("b", { json: [], tokens: null })], 10_000)).rejects.toThrow("a: HTTP 503; b: unusable answer");
    await expect(runLadder([model("a", { json: [1, 2, 3], tokens: null }, null)], 10_000)).rejects.toThrow("no AI provider key configured");
  });
});
