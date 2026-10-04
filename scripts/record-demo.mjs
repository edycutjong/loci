// Records the demo clip of the real app: the one-tap example palace, a short walk, then typed recall with the
// lights out until every stop is green. No AI call is made (the example palace was prepared in advance).
// The answers are typed by this script, not recalled by a person; say so wherever the clip is shown.
//
//   npm run build && npm run preview      (or BASE_URL=https://loci.edycu.dev)
//   npm run demo                          → test-results/demo/loci-demo.{webm,mp4,gif} + poster.jpg
//
// Needs ffmpeg on PATH; gifsicle is used too when installed.
import { spawnSync } from "node:child_process";
import { mkdirSync, renameSync, statSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:4174";
const OUT = new URL("../test-results/demo/", import.meta.url).pathname;
const SIZE = { width: 1280, height: 800 };

// The example list, answered the way a person types: one typo the checker forgives ("occulomotor") and one
// accepted answer from the list itself ("auditory" for Vestibulocochlear).
const ANSWERS = ["Olfactory", "Optic", "occulomotor", "Trochlear", "Trigeminal", "Abducens", "Facial", "auditory", "Glossopharyngeal", "Vagus", "Accessory", "Hypoglossal"];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: OUT, size: SIZE } });
const page = await context.newPage();
const started = Date.now();
const pause = (ms) => page.waitForTimeout(ms);

await page.goto(BASE);
await page.getByRole("button", { name: "Try it: 12 cranial nerves" }).waitFor();
const firstFrame = (Date.now() - started) / 1000; // everything before this is a blank page
await pause(2200);

await page.getByRole("button", { name: "Try it: 12 cranial nerves" }).click();
await page.locator("#scene-item").waitFor();
await pause(2000);
for (let stop = 2; stop <= 4; stop++) {
  await page.getByRole("button", { name: /^Next stop/ }).click();
  await pause(1900);
}

await page.getByRole("button", { name: "Recall, lights out" }).click();
await pause(1300);
for (const answer of ANSWERS) {
  const box = page.getByPlaceholder("Type it");
  await box.pressSequentially(answer, { delay: 45 });
  await box.press("Enter");
  await pause(750);
}
await page.locator(".result-lit").waitFor();
await pause(3200);

const video = page.video();
await context.close();
await browser.close();
const webm = `${OUT}loci-demo.webm`;
renameSync(await video.path(), webm);

const skip = Math.max(0, firstFrame - 0.1).toFixed(2);
const ffmpeg = (...args) => {
  const run = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
  if (run.status !== 0) throw new Error(`ffmpeg ${args.at(-1)} failed`);
};
ffmpeg("-ss", skip, "-i", webm, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "27", "-preset", "slow", "-movflags", "+faststart", `${OUT}loci-demo.mp4`);
ffmpeg("-ss", skip, "-i", webm, "-vf", "fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", "-loop", "0", `${OUT}loci-demo.gif`);
ffmpeg("-sseof", "-1", "-i", webm, "-frames:v", "1", "-q:v", "3", `${OUT}poster.jpg`);
// Under 5 MB, so GitHub shows the GIF inline in the release notes.
spawnSync("gifsicle", ["-O3", "--lossy=80", "-b", `${OUT}loci-demo.gif`], { stdio: "inherit" });

const mb = (f) => (statSync(`${OUT}${f}`).size / 1e6).toFixed(1);
console.log(`recorded ${BASE} → ${OUT}`);
console.log(`  loci-demo.mp4 ${mb("loci-demo.mp4")} MB · loci-demo.gif ${mb("loci-demo.gif")} MB · poster.jpg`);
