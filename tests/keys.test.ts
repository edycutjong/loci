import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { build } from "vite";
import { afterAll, describe, expect, it } from "vitest";

// The AI keys belong to the two server helpers (api/*.ts read process.env); the browser only ever calls /api/*.
// These tests make that a checked fact instead of a promise: the real client build is made with canary keys set,
// and nothing the browser can download may hold a key, a provider's address or a key header.

const ROOT = new URL("..", import.meta.url).pathname;
// Canaries are unique but shaped like no real key, so secret scanners never mistake this file for a leak.
const CANARIES = { GEMINI_API_KEY: "loci-canary-gemini-7d1f40c2", DEEPSEEK_API_KEY: "loci-canary-deepseek-2b9e81a6" };
const KEY_SHAPES = [/AIza[0-9A-Za-z_-]{30,}/, /sk-[0-9A-Za-z]{20,}/, /\bAQ\.[0-9A-Za-z_-]{20,}/];
const PROVIDER_TRACES = ["generativelanguage.googleapis.com", "api.deepseek.com", "x-goog-api-key", "Bearer "];

const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
const out = mkdtempSync(join(tmpdir(), "loci-client-"));
afterAll(() => rmSync(out, { recursive: true, force: true }));

describe("keys stay on the server", () => {
  it("the client build holds no key, provider address or key header, even with keys set while it is built", async () => {
    const saved = { ...process.env };
    Object.assign(process.env, CANARIES);
    try {
      await build({ root: ROOT, configFile: join(ROOT, "vite.config.ts"), logLevel: "silent", build: { outDir: out, emptyOutDir: true } });
      // vite.config.ts copies .env.local into process.env, as Vercel would set the keys: check whatever values won.
      const secrets = [...Object.values(CANARIES), process.env.GEMINI_API_KEY, process.env.DEEPSEEK_API_KEY].filter((v): v is string => !!v && v.length >= 16);

      const emitted = files(out);
      expect(emitted.some((f) => f.endsWith(".js"))).toBe(true);
      const holding: string[] = []; // file names only: a failing run must never print a key
      for (const file of emitted) {
        const body = readFileSync(file, "latin1");
        const name = relative(out, file);
        if (secrets.some((s) => body.includes(s))) holding.push(`${name}: a key value`);
        if (KEY_SHAPES.some((shape) => shape.test(body))) holding.push(`${name}: something shaped like a key`);
        for (const trace of PROVIDER_TRACES) if (/\.(js|html|css|json)$/.test(file) && body.includes(trace)) holding.push(`${name}: ${trace}`);
      }
      expect(holding).toEqual([]);
    } finally {
      for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
      Object.assign(process.env, saved);
    }
  }, 60_000);

  it("browser code never reads the environment, and no key is named so that Vite would ship it", () => {
    const sources = files(join(ROOT, "src")).filter((f) => /\.(ts|tsx)$/.test(f));
    expect(sources.length).toBeGreaterThan(10);
    const reads = sources.filter((f) => /process\.env|import\.meta\.env/.test(readFileSync(f, "utf8"))).map((f) => relative(ROOT, f));
    expect(reads).toEqual([]);
    // Vite exposes every VITE_* variable to the browser; the keys must never be named that way.
    const names = readFileSync(join(ROOT, ".env.example"), "utf8").match(/^[A-Z_]+(?==)/gm) ?? [];
    expect(names).toContain("GEMINI_API_KEY");
    expect(names.filter((n) => n.startsWith("VITE_"))).toEqual([]);
  });
});
