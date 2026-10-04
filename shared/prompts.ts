// What the AI models are asked, and the answer shapes they must return. Proven in the planning spike on three rooms.

export const ANCHOR_PROMPT = `This is a photo of someone's own room. They will use it as a memory palace (the method of loci): one item of a list they must memorize is placed on each of several objects, in order along a route through the room.

Find the best anchor objects in this photo: up to 16 distinct, concrete, clearly visible things that are easy to picture with eyes closed.
Good anchors: furniture, appliances, decorations, plants, bags, instruments, lamps, clocks, windows, doors, and any object with a colour or shape you would remember.
Avoid: walls, floor, ceiling, light switches, sockets, cables, small clutter, anything mostly hidden. Ignore people, faces and personal documents entirely.
Every anchor must be a different object. Never return the same object twice.
Spread the anchors across the whole photo, from the left edge to the right edge.

For each anchor return:
- label: a 1-3 word name that includes its most memorable feature, e.g. "yellow raincoat", "red kettle", "wall clock"
- box_2d: [ymin, xmin, ymax, xmax] normalized to 0-1000
Order the anchors from most to least memorable.`;

/** Gemini response schema for the anchors. */
export const ANCHOR_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: { label: { type: "STRING" }, box_2d: { type: "ARRAY", items: { type: "INTEGER" } } },
    required: ["label", "box_2d"],
  },
} as const;

/** For chat-style models that answer with a JSON object instead of following a schema. */
export const ANCHOR_JSON_SUFFIX = `

Return ONLY a JSON object: {"anchors": [{"label": string, "box_2d": [ymin, xmin, ymax, xmax]}]}, coordinates as integers normalized to 0-1000 (y relative to the image height, x to the width).`;

export type ScenePair = { object: string; item: string };

/** Keeps user text inert inside the instructions: one line, no quotes, bounded length. */
export function clip(text: string, max = 60): string {
  return text.replace(/[\r\n\t"`]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function scenePrompt(pairs: ScenePair[]): string {
  return `You are a memory coach using the method of loci. The learner walks a route through their own room. At each stop there is a real object from their room. Write one vivid memory scene per stop that binds the list item to that object.

Rules for every scene:
- One or two short sentences, at most 28 words, present tense, speaking to the learner as "you".
- Begin with the object ("Your red kettle ..." or "The red kettle ...").
- The object itself does something strange, exaggerated, funny or sensory with the item: movement, sound, smell, size, colour.
- Write the item itself, spelled exactly as given, in every scene, even when the image rests on a sound-alike. Example for the item "Trochlear" on a wall clock: "Your wall clock turns into a little truck-lear, honking 'Trochlear!' as it circles the room."
- If the item is abstract or unfamiliar, build the image on a sound-alike keyword (for example "trochlear" -> "truck-lear") and return that keyword as soundsLike. Otherwise soundsLike is "".
- Never mention another stop's item. Nothing violent, gory or unkind.

Stops, in walking order:
${pairs.map((p, i) => `${i + 1}. object: "${clip(p.object)}" - item: "${clip(p.item)}"`).join("\n")}`;
}

/** Gemini response schema for the scenes. */
export const SCENE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: { stop: { type: "INTEGER" }, scene: { type: "STRING" }, soundsLike: { type: "STRING" } },
    required: ["stop", "scene", "soundsLike"],
  },
} as const;

export const SCENE_JSON_SUFFIX = `

Return ONLY a JSON object: {"scenes": [{"stop": number, "scene": string, "soundsLike": string}]}, one entry per stop, in order.`;
