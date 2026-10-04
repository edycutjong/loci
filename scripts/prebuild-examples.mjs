// Prepares the example palaces from the REAL helpers, so the examples open instantly and honestly.
// Run with the dev server up (`npm run dev`, keys in .env.local), then: `npm run examples`.
// Writes src/examples/rooms.json (objects per example room) and src/examples/scenes.json (scenes per room × list).
import { readFileSync, writeFileSync } from "node:fs";
import { planRoute } from "../shared/route.ts";
import { parseList } from "../shared/list.ts";
import { EXAMPLE_LISTS } from "../src/examples/lists.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:5174";
const ROOMS = [
  { id: "kos", name: "Student room", width: 853, height: 1280 },
  { id: "studio", name: "Studio flat", width: 1280, height: 853 },
  { id: "kitchen", name: "Kitchen", width: 1280, height: 853 },
];
const today = new Date().toISOString().slice(0, 10);

async function post(path, body, tries = 2) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) return data;
    if (attempt >= tries) throw new Error(`${path} ${res.status}: ${data.error} ${data.detail ?? ""}`);
    console.log(`  (retrying ${path}: ${data.detail ?? data.error})`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

// Objects are found once and kept (rerun with --fresh to find them again); scenes are re-asked up to 3 times
// until every scene names its item, keeping the best answer.
const fresh = process.argv.includes("--fresh");
const roomsFile = new URL("../src/examples/rooms.json", import.meta.url);
let known = {};
try {
  known = fresh ? {} : JSON.parse(readFileSync(roomsFile, "utf8"));
} catch {
  known = {};
}
const rooms = {};
const scenes = {};
for (const room of ROOMS) {
  let found = known[room.id];
  if (!found) {
    const image = readFileSync(new URL(`../public/rooms/${room.id}.jpg`, import.meta.url)).toString("base64");
    const answer = await post("/api/anchors", { image });
    found = { name: room.name, width: room.width, height: room.height, anchors: answer.anchors, model: answer.model, date: today };
    console.log(`${room.id}: ${found.anchors.length} objects from ${found.model} in ${answer.ms} ms`);
  } else {
    console.log(`${room.id}: keeping ${found.anchors.length} objects from ${found.model} (${found.date})`);
  }
  rooms[room.id] = found;

  for (const list of EXAMPLE_LISTS) {
    const items = parseList(list.text).items;
    const plan = planRoute(found.anchors, items.length, room.width, room.height);
    if (plan.available < items.length) throw new Error(`${room.id} has only ${plan.available} usable stops for ${list.id}`);
    const named = (w) => w.scenes.filter((s, i) => s.scene.toLowerCase().includes(items[i].text.toLowerCase())).length;
    let best = null;
    for (let attempt = 1; attempt <= 3 && (!best || named(best) < items.length); attempt++) {
      const written = await post("/api/scenes", { stops: plan.stops.map((a, i) => ({ object: a.label, item: items[i].text })) });
      if (!best || named(written) > named(best)) best = written;
    }
    scenes[`${room.id}:${list.id}`] = { anchors: plan.stops, scenes: best.scenes, model: best.model, date: today };
    console.log(`  ${list.id}: ${best.scenes.length} scenes from ${best.model} (item named in ${named(best)}/${items.length})`);
  }
}

writeFileSync(new URL("../src/examples/rooms.json", import.meta.url), JSON.stringify(rooms, null, 1) + "\n");
writeFileSync(new URL("../src/examples/scenes.json", import.meta.url), JSON.stringify(scenes, null, 1) + "\n");
console.log(`wrote ${Object.keys(rooms).length} rooms and ${Object.keys(scenes).length} scene sets`);
