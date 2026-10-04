// The real-run receipt: builds palaces on the live site the way a person does, and keeps what the AI helpers answered.
// Nothing is stubbed. Chromium shrinks each photo exactly as the app does (src/lib/image.ts), /api/anchors and
// /api/scenes call the real models, and the wall clock runs from the "Build my palace" click to the first scene.
//
//   npx playwright install chromium
//   npm run receipt                                    → public/judge/receipt-<UTC date>.json + a summary
//   BASE_URL=http://localhost:5174 npm run receipt     (your dev server, with your own keys)
//
// Rooms: the three AI-generated example rooms in public/rooms/, uploaded as your own photo, so the app takes the real
// path (none of the objects or scenes prepared for the examples). Lists: the three example lists.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { parseList } from "../shared/list.ts";
import { EXAMPLE_LISTS } from "../src/examples/lists.ts";

const BASE = (process.env.BASE_URL ?? "https://devpost-learn-loci.vercel.app").replace(/\/$/, "");
const ROOMS = [
  { id: "kos", name: "Student room" },
  { id: "studio", name: "Studio flat" },
  { id: "kitchen", name: "Kitchen" },
];

// Published list prices in US$ per 1M tokens, checked 2026-10-05.
const PRICES = {
  sources: ["https://api-docs.deepseek.com/quick_start/pricing", "https://ai.google.dev/gemini-api/docs/pricing"],
  // DeepSeek: peak 01:00–04:00 and 06:00–10:00 UTC, Monday to Friday; every other hour is off-peak, at half price.
  "deepseek-flash": { offPeak: { input: 0.15, cached: 0.003, output: 0.6 }, peak: { input: 0.3, cached: 0.006, output: 1.2 } },
  // Gemini: paid-tier prices. A free-tier key is not billed at all.
  "gemini-3.8-flash": { input: 0.75, output: 3.75 },
  "gemini-3.5-flash": { input: 1.5, output: 9 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5 },
};

const peak = (date) => {
  const day = date.getUTCDay();
  const h = date.getUTCHours() + date.getUTCMinutes() / 60;
  return day >= 1 && day <= 5 && ((h >= 1 && h < 4) || (h >= 6 && h < 10));
};

/** US$ for one model's tokens at the list price in force at `when`. */
function cost(usage, when) {
  const p = PRICES[usage.model];
  if (!p) return null;
  const rate = p.offPeak ? (peak(when) ? p.peak : p.offPeak) : { ...p, cached: p.input };
  return ((usage.input - usage.cached) * rate.input + usage.cached * rate.cached + usage.output * rate.output) / 1e6;
}

/** Width and height from a JPEG's frame header. */
function jpegSize(bytes) {
  for (let i = 2; i + 9 < bytes.length; ) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];
    const length = bytes.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: bytes.readUInt16BE(i + 7), height: bytes.readUInt16BE(i + 5) };
    i += 2 + length;
  }
  return null;
}

const regions = (res) => (res.headers()["x-vercel-id"] ?? "").split("::").slice(0, -1).join(" → ") || null;
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};
const round = (x, d = 6) => Math.round(x * 10 ** d) / 10 ** d;

async function buildOne(browser, room, list) {
  const items = parseList(list.text).items;
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/`);
    await page.getByTestId("photo-input").setInputFiles(`public/rooms/${room.id}.jpg`);
    await page.getByLabel("Your list").fill(list.text);
    const anchorsSeen = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/anchors", { timeout: 150_000 });
    const scenesSeen = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/scenes", { timeout: 150_000 }).catch(() => null);
    const started = Date.now();
    await page.getByRole("button", { name: "Build my palace" }).click();

    const outcome = await Promise.race([
      page.locator("#scene-item").waitFor({ timeout: 150_000 }).then(() => "learn"),
      page.getByText(/good spots for/).waitFor({ timeout: 150_000 }).then(() => "too few stops"),
      page.getByText(/Couldn't reach the AI|took too long|came back incomplete|didn't find any objects/).waitFor({ timeout: 150_000 }).then(() => "failed"),
    ]);
    const wallMs = Date.now() - started;

    const aRes = await anchorsSeen;
    const aBody = await aRes.json();
    const image = Buffer.from(aRes.request().postDataJSON().image, "base64");
    const sRes = outcome === "learn" ? await scenesSeen : null;
    const sBody = sRes ? await sRes.json() : null;
    const stops = sRes ? sRes.request().postDataJSON().stops : [];
    const scenes = sBody?.scenes ?? [];
    const named = scenes.filter((s, i) => s.scene.toLowerCase().includes(stops[i].item.toLowerCase())).length;
    const at = new Date();

    return {
      at: at.toISOString(),
      room: room.id,
      list: list.id,
      items: items.length,
      outcome,
      wallMs,
      photoSent: { bytes: image.length, ...jpegSize(image) },
      anchors: { http: aRes.status(), model: aBody.model ?? null, modelMs: aBody.ms ?? null, tried: aBody.tried ?? null, usage: aBody.usage ?? null, vercel: regions(aRes), found: aBody.anchors?.length ?? 0, objects: aBody.anchors ?? [] },
      route: stops.map((s) => s.object),
      scenes: sRes
        ? { http: sRes.status(), model: sBody.model ?? null, modelMs: sBody.ms ?? null, tried: sBody.tried ?? null, usage: sBody.usage ?? null, vercel: regions(sRes), written: scenes.length, namingTheirItem: named, scenes: scenes.map((s, i) => ({ item: stops[i].item, ...s })) }
        : null,
      costUsd: round([...(aBody.usage ?? []), ...(sBody?.usage ?? [])].reduce((sum, u) => sum + (cost(u, at) ?? 0), 0)),
    };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch();
const startedAt = new Date();
const palaces = [];
for (const room of ROOMS) {
  for (const list of EXAMPLE_LISTS) {
    const p = await buildOne(browser, room, list);
    palaces.push(p);
    console.log(
      `${room.id} × ${list.id}: ${p.outcome} in ${(p.wallMs / 1000).toFixed(2)} s · objects ${p.anchors.found} (${p.anchors.model}) · ` +
        `stops ${p.route.length} · scenes ${p.scenes?.written ?? 0} (${p.scenes?.model ?? "-"}), ${p.scenes?.namingTheirItem ?? 0} name their item · $${p.costUsd}`,
    );
  }
}
const browserVersion = browser.version();
await browser.close();
const finishedAt = new Date();

// Totals by model: every answered call's tokens, each priced at the rate in force when its palace finished.
const byModel = {};
for (const p of palaces) {
  for (const u of [...(p.anchors.usage ?? []), ...(p.scenes?.usage ?? [])]) {
    const m = (byModel[u.model] ??= { calls: 0, input: 0, cached: 0, output: 0, listPriceUsd: 0 });
    m.calls += 1;
    m.input += u.input;
    m.cached += u.cached;
    m.output += u.output;
    m.listPriceUsd = round(m.listPriceUsd + (cost(u, new Date(p.at)) ?? 0));
  }
}
const built = palaces.filter((p) => p.outcome === "learn");
const answeredBy = (step) => Object.entries(palaces.reduce((n, p) => ((n[p[step]?.model ?? "none"] = (n[p[step]?.model ?? "none"] ?? 0) + 1), n), {}));
const totals = {
  palaces: palaces.length,
  built: built.length,
  objectsFound: palaces.reduce((n, p) => n + p.anchors.found, 0),
  stopsPlaced: built.reduce((n, p) => n + p.route.length, 0),
  scenesWritten: built.reduce((n, p) => n + p.scenes.written, 0),
  scenesNamingTheirItem: built.reduce((n, p) => n + p.scenes.namingTheirItem, 0),
  wallSeconds: { p50: round(median(built.map((p) => p.wallMs)) / 1000, 2), max: round(Math.max(...built.map((p) => p.wallMs)) / 1000, 2) },
  objectsAnsweredBy: Object.fromEntries(answeredBy("anchors")),
  scenesAnsweredBy: Object.fromEntries(answeredBy("scenes")),
  tokensByModel: byModel,
  listPriceUsd: round(Object.values(byModel).reduce((s, m) => s + m.listPriceUsd, 0)),
  deepseekRate: [...new Set(palaces.map((p) => (peak(new Date(p.at)) ? "peak" : "off-peak")))].join(" and "),
};

let commit = null;
try {
  commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
} catch {}

const receipt = {
  what: "Palaces built on the live site with nothing stubbed: 3 AI-generated rooms × 3 example lists, uploaded as your own photo.",
  site: BASE,
  commit,
  browser: `Chromium ${browserVersion}`,
  started: startedAt.toISOString(),
  finished: finishedAt.toISOString(),
  prices: PRICES,
  totals,
  palaces,
};
const out = process.env.RECEIPT_OUT ?? `public/judge/receipt-${startedAt.toISOString().slice(0, 10)}.json`;
mkdirSync(out.split("/").slice(0, -1).join("/") || ".", { recursive: true });
writeFileSync(out, JSON.stringify(receipt, null, 1) + "\n");
console.log(`\n${totals.built}/${totals.palaces} palaces built · ${totals.objectsFound} objects · ${totals.stopsPlaced} stops · ${totals.scenesWritten} scenes (${totals.scenesNamingTheirItem} name their item)`);
console.log(`wall clock p50 ${totals.wallSeconds.p50} s · max ${totals.wallSeconds.max} s · list price $${totals.listPriceUsd} (DeepSeek ${totals.deepseekRate})`);
console.log(`wrote ${out}`);
