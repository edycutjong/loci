import { readdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { NERVES, stubAi, typeAnswer } from "./helpers";

// The judge page (/judge/), built for one reader with no account and no session. It must load with nothing stored,
// carry the same claim sentence as JUDGE.md, show the receipt's own numbers, and its 30-second path must work.
const CLAIM = readFileSync(new URL("../JUDGE.md", import.meta.url), "utf8").match(/^\*\*(Loci turns .+)\*\*$/m)![1];
const JUDGE_DIR = new URL("../public/judge/", import.meta.url);
const RECEIPT_FILE = readdirSync(JUDGE_DIR).filter((f) => /^receipt-.+\.json$/.test(f)).sort().at(-1)!;
const receipt = JSON.parse(readFileSync(new URL(RECEIPT_FILE, JUDGE_DIR), "utf8"));

/** Console errors, page errors and failed or 400+ sub-requests on this page. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`));
  page.on("requestfailed", (r) => problems.push(`failed ${r.url()}`));
  return problems;
}

test("/judge redirects to /judge/, which opens with no cookies or saved state and states the same claim as JUDGE.md", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  const redirect = await page.request.get("/judge", { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers()["location"]).toBe("/judge/");

  const problems = watch(page);
  const response = await page.goto("/judge/");
  expect(response!.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(CLAIM);
  await expect(page.locator(".path > li")).toHaveCount(5);
  await page.waitForLoadState("networkidle");
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  expect(problems).toEqual([]);
  await context.close();
});

test("every number on the judge page is the receipt's own, and every link to the site resolves", async ({ page }) => {
  await page.goto("/judge/");
  const t = receipt.totals;
  await expect(page.locator(".receipts .num")).toHaveText([`${t.built}/${t.palaces}`, `${t.stopsPlaced}`, `${t.scenesNamingTheirItem}/${t.scenesWritten}`, `${t.wallSeconds.p50.toFixed(2)} s`]);
  await expect(page.locator(".note")).toContainText(`$${t.listPriceUsd.toFixed(4)} at list prices`);
  await expect(page.locator("tbody tr")).toHaveCount(receipt.palaces.length);

  const raw = await page.request.get(`/judge/${RECEIPT_FILE}`);
  expect(raw.status()).toBe(200);
  expect((await raw.json()).totals).toEqual(t);

  const hrefs = await page.locator("a[href]").evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).href));
  const base = new URL(page.url());
  const own = [...new Set(hrefs.filter((h) => new URL(h).origin === base.origin).map((h) => h.split("#")[0]))];
  expect(own.length).toBeGreaterThan(4);
  for (const href of own) expect((await page.request.get(href)).status(), href).toBe(200);
  for (const href of hrefs.filter((h) => new URL(h).origin !== base.origin)) expect(href, "outside links use https").toMatch(/^https:\/\//);
});

test("the 30-second path works: no AI call, no request off the site, and the page's own examples score as it says", async ({ page, baseURL }) => {
  const calls = await stubAi(page);
  const offSite: string[] = []; // the browser talks only to Loci: never to an AI provider, never with a key
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (["http:", "https:"].includes(url.protocol) && url.host !== new URL(baseURL!).host) offSite.push(r.url());
  });

  await page.goto("/judge/");
  await page.locator(".path").getByRole("link", { name: "Open Loci" }).click(); // 1
  await page.getByRole("button", { name: "Try it: 12 cranial nerves" }).click(); // 2
  await expect(page.locator("#scene-item")).toHaveText(NERVES[0]);
  for (let i = 1; i <= 2; i++) {
    await page.getByRole("button", { name: /^Next stop/ }).click(); // 3
    await expect(page.locator("#scene-item")).toHaveText(NERVES[i]);
  }

  await page.getByRole("button", { name: "Recall, lights out" }).click(); // 4
  for (let i = 0; i < NERVES.length; i++) await typeAnswer(page, i === 2 ? "occulomotor" : i === 4 ? "Optic" : NERVES[i]);
  await expect(page.locator(".result-title")).toHaveText("You remembered 11 of 12 on the first try."); // 5
  await expect(page.locator(".palace .pin").nth(2)).toHaveAttribute("data-state", "right");
  await expect(page.locator(".palace .pin").nth(4)).toHaveAttribute("data-state", "wrong");

  await page.getByRole("button", { name: "Retry the missed stop" }).click();
  await typeAnswer(page, NERVES[4]);
  await expect(page.locator(".result-lit")).toHaveText(/Every light is on/);
  expect(calls).toEqual({ anchors: 0, scenes: 0 });
  expect(offSite).toEqual([]);
});
