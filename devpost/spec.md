---
doc: spec
status: approved
---

# Loci — Technical Spec

> The learner's standing instruction: "No questions to me. If a skill asks me something, answer for me — simple." The technical choices below are the agent's recommendations, accepted under that instruction. They are listed under **Interview Record** and marked *(answered by agent per learner's standing instruction)*.

## How This Works, In Plain Language
Loci is a web page that works on a phone or a laptop. It has three pieces.

1. **The app in your browser.** It shows the screens, keeps your palaces, runs the route, and checks your answers. Your palaces live in the browser's own storage on your device (IndexedDB: a small database each website gets inside your browser). Nothing about you is stored anywhere else.
2. **Two small helpers on a server** (Vercel functions: tiny programs that run only when asked). They exist because the AI services need secret keys, and secrets must never be sent to a browser.
   - **Find objects:** takes your room photo and asks Google's Gemini AI for the most memorable objects and where they are in the photo (a box around each). If Gemini is busy, it tries smaller Gemini models, then DeepSeek's AI.
   - **Write scenes:** takes pairs like "red kettle + Olfactory" (only names, never the photo) and asks DeepSeek's AI for one short, strange scene per pair. If DeepSeek is down, it asks Gemini.
3. **The browser's speech-to-text** (the Web Speech API, built into Chrome and Edge) turns what you say into text during recall.

The AI only proposes. Plain code decides everything that must be trusted:
- which objects become stops (no duplicates, no pins on top of each other),
- the route (the shortest path from the leftmost stop to the rightmost),
- and whether an answer is right. **The answer checker** cleans up both texts (lower case, no punctuation, no "1." in front), then counts how many letters you'd have to change to turn your answer into the item. Short words must be exact; longer words forgive one or two typos.

Why this shape: one photo and one list per palace, two helpers, no accounts, no database server. That is the smallest setup that proves your own room can become a memory palace and that you can recall it.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **You open Loci** → the app reads your saved palaces from the browser's storage and shows them on Home with the new-palace form.
2. **You pick a photo** → the app shrinks it on your device to at most 1280 px on the long side (a JPEG of about 250–310 KB) and shows it. *Or* you tap an example room → the app uses the example's photo from the site and its objects, prepared in advance.
3. **You paste a list** → the app splits it into items (one per line), drops "1." style numbering, splits accepted answers on " / ", and checks the limits (3–12 items, ≤4 words each).
4. **You tap Build** → the Palace screen opens with your photo and "Finding objects in your room".
   - Own photo: the app sends the shrunk photo to **Find objects** → the helper asks Gemini (then fallbacks) → returns up to 16 objects with boxes, most memorable first. Example room: the prepared objects are used, no call.
   - The app keeps the best objects that are valid, distinct and not crowded (centres at least 7% of the photo's diagonal apart), takes as many as you have items, and computes the route. If there are too few, you see "Found 8 good spots for 12 items" and choose.
   - Pins drop onto the objects in route order and the dotted route draws itself.
   - "Writing a scene for each stop" → the app sends the object+item pairs to **Write scenes** → DeepSeek (then fallbacks) → one scene and one sound-alike per stop. Example room + example list: prepared scenes, no call.
   - The finished palace (photo, stops, scenes) is saved in the browser's storage and Learn opens.
5. **You learn** → the app moves and zooms the photo toward the current object and shows its scene card. The learn timer runs. No network needed.
6. **You start recall** → the photo is hidden; only route and pins remain. For each stop:
   - typed answer → **the answer checker** → green or red;
   - spoken answer → the browser's speech-to-text gives up to 5 guesses of what you said → the **voice interpreter** checks each guess with the answer checker (plus a sound-alike check) → green, red, "skipped", or "didn't catch that" (no penalty).
   - Green → that part of the photo is lit again through a soft round window, and the next stop starts.
7. **The last stop is answered** → the result is computed (first-try count, learn and recall time), saved with the palace, and shown. All green → the whole photo fades back in.
8. **You retry the misses** → recall runs again over the red stops only; the first-try number never changes.
9. **You come back tomorrow** → step 1 again; your palace and its last result are on Home.

## Stack
Agent recommendation, accepted by the learner. *(answered by agent per learner's standing instruction)*

- **Vite 8 + React 19 + TypeScript 7** for the app. The learner works through coding agents daily; this is a common, well-documented setup, and React keeps the three palace modes (Learn, Recall, Result) manageable. Tradeoff accepted: a build step, versus a plain HTML page that would be hard to keep tidy with this many states. https://vite.dev · https://react.dev · https://www.typescriptlang.org
- **Two Vercel functions** (`api/anchors.ts`, `api/scenes.ts`) using plain `fetch` to the Gemini and DeepSeek REST APIs — no AI SDKs. Tradeoff accepted: a server is required for the keys, so a pure static page isn't possible. https://vercel.com/docs/functions
- **idb-keyval 6** for saving palaces in IndexedDB (photos are large; IndexedDB stores image files directly, localStorage can't). https://github.com/jakearchibald/idb-keyval
- **Web Speech API** for voice, no library. https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition · spec: https://webaudio.github.io/web-speech-api/
- **lucide-react** for icons (one consistent stroke set; no emoji as icons). https://lucide.dev
- **Fonts, self-hosted from npm:** Piazzolla (variable) for items and headings, Atkinson Hyperlegible Next (variable) for the interface, Atkinson Hyperlegible Mono for times and scores. https://fonts.google.com/specimen/Piazzolla · https://fonts.google.com/specimen/Atkinson+Hyperlegible+Next · https://fonts.google.com/specimen/Atkinson+Hyperlegible+Mono
- **Vitest 5** for unit tests, **Playwright 1.63** for browser checks. https://vitest.dev · https://playwright.dev
- **To verify early in the build:** Chrome's `SpeechRecognitionPhrase` / `processLocally` behaviour (seen in Chrome 154 on 2026-10-04 by a feature check, not yet with a real microphone); Vercel's Node runtime with web-standard `POST(request)` handlers and `.js` import paths for `shared/` modules.

## Where It Runs and How Someone Tries It
- **Runs in:** any modern browser. Voice recall needs Chrome or Edge (desktop or Android); Safari and Firefox type their answers. Building a palace needs the internet; learning and typed recall of a saved palace don't.
- **Local (for building and recording):**
  1. Node 22+. `npm install`.
  2. Copy `.env.example` to `.env.local` and fill in `GEMINI_API_KEY` and `DEEPSEEK_API_KEY` (either one alone also works, with fewer fallbacks).
  3. `npm run dev` → open **http://localhost:5174**. The dev server also serves `/api/anchors` and `/api/scenes`, so no Vercel tools are needed locally.
- **Live:** Vercel project `devpost-learn-loci`, deployed automatically from the GitHub repo's `main` branch. The same two keys are set as Vercel environment variables. Canonical address **https://loci.edycu.dev** (custom domain). *(answered by agent per learner's standing instruction: a live link so judges and classmates can try it)*
- **What to record for the demo:** the live site in Chrome; my own room photo + a list I've never studied → Build → Learn once → Recall by voice with eyes closed → all green. Submission still requires the demo video and the public GitHub repository; the live link is extra.
- **Sharing (recorded at 6-ship, 2026-10-05):**
  - Live app: https://loci.edycu.dev. No sign-up; the one-tap example needs no AI call.
  - Repository: https://github.com/edycutjong/loci, MIT. Private while building; the learner makes it public at submission.
  - Demo video: recorded (2:30, the live site in one take). The learner uploads it to YouTube as public, and its link is added here and to the README.
- **Checks:** `npm test` (unit), `npm run e2e` (browser checks against the production build, AI and microphone stubbed), `npm run build`.

## Look and Feel
Carries `prd.md > Look and Feel` and `scope.md > Inspiration & Identity` into tokens. Direction: **lights out** — the room photo is the only bright thing; recall darkens it and each remembered item re-lights a pool of it.

- **Palette** (CSS custom properties in `src/styles/tokens.css`):
  - `--night-900 #0E1534` page ground (a dark room at night — blue, not black) · `--night-800 #141C40` panels · `--night-700 #1D2752` inputs, raised · `--night-600 #2A3668` dividers only (decorative, 1.55:1).
  - `--moon-100 #EEF1FA` main text and primary buttons · `--moon-300 #B9C1DD` secondary text · `--moon-500 #8590B8` tertiary text and the dotted route (5.68:1 on the ground).
  - `--lit #46D98A` remembered (pins, ticks) · `--miss #FF7F6E` missed (pins, crosses). Nothing else is coloured; the photo brings the colour.
  - Every pairing is checked for WCAG AA (≥4.5:1 text, ≥3:1 pins, marks and the route) by a test. Measured while writing this spec: lowest text pair 5.26:1 (`--moon-500` on `--night-800`), green on ground 9.83:1, coral on ground 7.24:1.
- **Type:** Piazzolla 600–700 for items (2.25rem on a phone, 3rem wide), titles and the wordmark; Atkinson Hyperlegible Next for all interface text (16–17px base, line length ≤ 70ch); Atkinson Hyperlegible Mono only for timers and scores (measurement, not decoration). Tabular numbers on pins.
- **Motion:** one authored moment — the **light pool** (a soft radial window into the photo grows from the pin, 700 ms, exponential ease-out) and, when all are green, the whole photo returning (900 ms). The Learn "walk" between stops is a functional 650 ms glide. Under `prefers-reduced-motion` every one of these is instant.
- **Density and tone:** spacious and calm; one primary action per state. Copy is short and plain ("Say it or type it.", "Not this one.", "Every light is on."). No confetti, points, streaks.
- **Browser surfaces themed:** text selection, caret, focus rings (2px moon-white with offset), scrollbars, placeholder text.
- **Not this:** Room to Speak's warm off-white, terracotta, Nunito / Young Serif; purple gradients; glass cards; neon glow halos; cream paper.

## Components

### Home screen (`src/screens/Home.tsx`)
Shows "Your palaces" (when any) and the new-palace form; starts a build.
PRD ref: `prd.md > Screens and Layout`, `prd.md > Starting a palace`, `prd.md > Saved palaces`.

#### Room picker (`src/components/RoomPicker.tsx`)
A photo input (`accept="image/*"`, camera or gallery) plus three example-room tiles labelled "AI-generated example", and the privacy line. Hands the chosen photo to **Image shrinker** or the example's id to **Palace builder**.
PRD ref: `prd.md > Starting a palace`.

#### List box (`src/components/ListBox.tsx`)
Textarea + example-list chips + live counter + inline "keep items to 4 words or fewer" marks, using **List parser**. Disables Build with the reason when limits fail.
PRD ref: `prd.md > Starting a palace`.

#### Palace list (`src/components/PalaceList.tsx`)
One row per saved palace: room thumbnail, title, last result ("11/12 first try · Oct 4"), open, delete (with confirm).
PRD ref: `prd.md > Saved palaces`.

### Palace screen (`src/screens/Palace.tsx`)
Holds one palace and its mode: building → learn → recall → result. Header with Back, title, Learn / Recall switch.
PRD ref: `prd.md > Screens and Layout`.

#### Stage (`src/components/Stage.tsx`)
The photo with pins and the dotted route, in one layer that can move and zoom (the **camera**). Draws:
- pins as real buttons (keyboard and screen-reader reachable), counter-scaled so they stay the same size while zoomed;
- the route as an SVG polyline through the pin centres;
- in recall, the **light pools**: the photo is masked to black-night except soft circles at green stops (SVG mask with radial gradients); all green removes the mask.
PRD ref: `prd.md > Building the palace`, `prd.md > Learning the route`, `prd.md > Recalling — lights out`.

#### Scene card (`src/components/SceneCard.tsx`)
"Stop 3 of 12", the item (Piazzolla), "on the single bed", the scene with the item's words marked, "Sounds like: …". Next / Back, swipe, arrows; "All stops"; "Start recall" at the end; learn timer.
PRD ref: `prd.md > Learning the route`.

#### Recall panel (`src/components/RecallPanel.tsx`)
"Stop 3 · the single bed", the text box (no autocorrect/autocapitalise/spellcheck), the microphone button with listening state and live "Heard: …" line, Skip, recall timer. Uses **Answer checker** and **Voice interpreter**; announces each result in a polite live region.
PRD ref: `prd.md > Recalling — lights out`, `prd.md > States and Boundaries`.

#### Result panel (`src/components/ResultPanel.tsx`)
"11 of 12 on the first try", learn and recall times, "12 of 12 after retry" when relevant, Relearn the misses, Retry the misses, Copy result, Walk it again.
PRD ref: `prd.md > Result and retrying misses`.

### Palace builder (`src/lib/build.ts`)
Runs the build steps for the three cases (own photo / example room + own list / example room + example list), reports progress, and returns either a palace, "too few spots (n)", or a failed step that can be retried without redoing the steps before it.
PRD ref: `prd.md > Building the palace`, `prd.md > States and Boundaries`.

### Image shrinker (`src/lib/image.ts`)
Decodes the chosen file (respecting phone rotation), draws it at ≤1280 px on a canvas, exports JPEG quality 0.82. Unreadable file → "That file isn't a photo we can open."
PRD ref: `prd.md > Starting a palace`.

### Find objects helper (`api/anchors.ts`)
POST photo → up to 16 validated objects, most memorable first. Model ladder with a 55 s total budget: `gemini-3.8-flash` → `gemini-3.5-flash` → `gemini-3.1-flash-lite` → `deepseek-flash`; 429/503/timeouts move to the next. First Gemini model can be overridden with `GEMINI_MODEL`.
PRD ref: `prd.md > Building the palace`.

### Write scenes helper (`api/scenes.ts`)
POST object+item pairs → one scene + sound-alike each, in order. Ladder: `deepseek-flash` → `gemini-3.8-flash` → `gemini-3.1-flash-lite`. A model answer with a missing or empty scene counts as a failure and moves down the ladder.
PRD ref: `prd.md > Building the palace`, `prd.md > Learning the route`.

### Shared rules (`shared/`)
Plain TypeScript used by the app and the helpers, each with unit tests.

#### Model instructions (`shared/prompts.ts`)
The object-finding and scene-writing instructions proven in the spike, plus response schemas.

#### Answer validation (`shared/validate.ts`)
Drops malformed boxes (not 4 numbers in 0–1000, inverted, too small < 0.15% or too big > 60% of the photo) and malformed scenes. Never repairs a model answer.

#### Route maker (`shared/route.ts`)
`chooseAnchors(anchors, n, w, h)`: in the model's order, skip duplicates (box overlap IoU > 0.5, or same name with centres < 5% of the diagonal apart) and crowded ones (centres < 7% of the diagonal apart), keep the first n. `shortestRoute(points)`: exact shortest path from the leftmost to the rightmost point (Held-Karp, ≤12 stops, a few ms). `boxToPixels` converts `[ymin, xmin, ymax, xmax]` (0–1000, y first) to pixels.
PRD ref: `prd.md > Building the palace`.

#### List parser (`shared/list.ts`)
Lines → items: trims, skips blanks, removes leading "1." / "1)" / "-" / "•", splits on " / " (spaces required, so "AC/DC" stays whole) into the shown text + accepted answers; reports counts and items over 4 words or 40 characters.
PRD ref: `prd.md > Starting a palace`.

#### Answer checker (`shared/score.ts`)
The learner's learning focus — small enough to read in one sitting.
- `normalize`: lower case, strip accents, trim, collapse spaces, drop a leading ordinal ("1.", "iii.", "CN I:"), drop punctuation.
- `distance`: Damerau-Levenshtein (counts a swapped pair of letters as one change).
- `isRight(answer, item)`: true if, for the item text or any accepted answer, the answers are equal, or they have the same number of words and every word is within its allowance — `min(2, floor(0.2 × word length))`: 0 for words of ≤4 letters, 1 for 5–9, 2 for 10+ — with at most 3 changes in total, or they are equal once spaces are removed ("oat milk" = "oatmilk"). An empty answer is never right.
- So "occulomotor" = "oculomotor" (1 change, 10 letters), but "Vitamin C" ≠ "Vitamin D" and "Henry VII" ≠ "Henry VIII" (short words must be exact).
PRD ref: `prd.md > Recalling — lights out`.

#### Voice interpreter (`shared/voice.ts`)
Turns one spoken phrase (up to 5 guesses from the browser) into results, given the current stop and the stops still open:
1. any guess, or any run of 1–5 consecutive words in it, or that run without spaces, is right for the current stop (answer checker, or same sound-key for items ≥5 letters) → **green**, and the rest of the phrase is checked against the next stop (so "olfactory optic" lights two pins);
2. right for one of the next two stops → the stops in between are **missed**, that one is **green**;
3. "skip", "pass", "next", "I don't know" → current **missed**;
4. right for a different open stop → current **missed** (wrong order);
5. right for a stop already answered → ignored;
6. anything else → **not caught** ("Didn't catch that — say it again, or type it"), no penalty.
Sound-key: a small consonant skeleton (c/k/q→k, ph/v→f, b→p, d→t, g→k, z→s, vowels after the first letter dropped, repeats collapsed); a unit test checks that no two items in each example list share a key.
PRD ref: `prd.md > Recalling — lights out`.

### Speech listener (`src/lib/speech.ts`)
Wraps `SpeechRecognition` (or `webkitSpeechRecognition`): `en-US`, continuous, interim results on, 5 alternatives; restarts itself after the browser's silence timeout while recall is on; maps errors to the PRD messages (`not-allowed` → blocked, `no-speech` → didn't catch that, missing API → typing only). Where `SpeechRecognition.available({langs:["en-US"], processLocally:true})` already says "available", it listens on-device and passes the list items as `phrases` (boost 5) to bias recognition; otherwise it uses the browser's default service without phrases.
PRD ref: `prd.md > Recalling — lights out`, `prd.md > States and Boundaries`.

### Palace store (`src/lib/store.ts`)
idb-keyval over IndexedDB: `palace:<id>` → palace record, `photo:<id>` → the photo file (own photos only; examples point at `/rooms/<id>.jpg`). List, get, save, add a walk, delete (both keys). If saving fails, the palace is kept in memory for this session and the screen says it won't be kept.
PRD ref: `prd.md > Saved palaces`, `prd.md > States and Boundaries`.

### Examples (`src/examples/`)
- `lists.ts`: the three example lists (12 cranial nerves, the first 12 elements, a 10-item grocery run).
- `rooms.json`: for `kos`, `studio`, `kitchen`: photo size and all objects found, with model and date.
- `scenes.json`: scenes for each example room × example list (9 palaces), with model and date.
Produced by `scripts/prebuild-examples.mjs`, which sends the example photos through the real `/api/anchors` and `/api/scenes` on the local dev server. Labelled in the app as "prepared in advance".
PRD ref: `prd.md > Building the palace` (instant examples).

### Dev API bridge (`vite.config.ts`)
A small Vite plugin that serves `api/*.ts` handlers at `/api/*` during `npm run dev`, so local runs need no Vercel CLI. Dev server fixed to port 5174.

## Data Model
All in the browser's IndexedDB, under this site only.

```ts
type Box = [number, number, number, number];        // ymin, xmin, ymax, xmax in 0–1000 (y first)
type Anchor = { label: string; box: Box };            // e.g. { label: "red kettle", box: [468, 908, 542, 998] }
type Item = { text: string; accepts: string[] };      // "Vestibulocochlear / auditory" → text + ["auditory"]
type Stop = { item: Item; anchor: Anchor; scene: string; soundsLike: string };
type Walk = {
  at: number;                                         // when it finished (ms since 1970)
  firstTry: boolean[];                                // per stop, in route order
  afterRetry: boolean[] | null;                       // per stop, after the latest retry
  learnMs: number | null; recallMs: number;
};
type Palace = {
  id: string; createdAt: number; title: string;       // "Cranial nerves" or "Olfactory → Hypoglossal"
  room: { kind: "example"; id: "kos" | "studio" | "kitchen" } | { kind: "photo" };
  photo: { width: number; height: number };           // the shrunk photo's size
  stops: Stop[];                                      // in route order; stop k holds item k
  made: { anchors: string; scenes: string; prepared: boolean }; // which models, and whether prepared in advance
  walks: Walk[];
};
```

- **Where it lives:** `palace:<id>` and `photo:<id>` in IndexedDB. Example photos are files on the site.
- **How it changes:** created once at build; a `Walk` is appended when a full recall ends, and its `afterRetry` is updated by retries.
- **When you leave and come back:** palaces and walks are read back on Home. A recall in progress and the timers are in memory only, so leaving mid-recall starts it fresh.
- **Deleting a palace** removes both keys.

## File Structure

```
build/
├── api/
│   ├── anchors.ts            # POST /api/anchors — photo → objects (Gemini ladder → DeepSeek)
│   └── scenes.ts             # POST /api/scenes — object+item pairs → scenes (DeepSeek → Gemini)
├── shared/                   # plain rules shared by app and helpers (all unit-tested)
│   ├── types.ts              # Box, Anchor, Item, Stop, Walk, Palace
│   ├── prompts.ts            # model instructions + response schemas (from the spike)
│   ├── providers.ts          # fetch calls to Gemini / DeepSeek + the fallback ladder
│   ├── validate.ts           # drop malformed model answers
│   ├── route.ts              # choose objects, shortest left→right route, box → pixels
│   ├── list.ts               # pasted list → items + accepted answers + limit checks
│   ├── score.ts              # the answer checker
│   └── voice.ts              # spoken phrase → green / missed / not caught
├── src/
│   ├── main.tsx              # entry; loads fonts and styles
│   ├── App.tsx               # hash routes: #/ (Home) and #/p/<id> (Palace)
│   ├── screens/
│   │   ├── Home.tsx
│   │   └── Palace.tsx
│   ├── components/
│   │   ├── RoomPicker.tsx
│   │   ├── ListBox.tsx
│   │   ├── PalaceList.tsx
│   │   ├── Stage.tsx         # photo, pins, route, camera, light pools
│   │   ├── SceneCard.tsx
│   │   ├── RecallPanel.tsx
│   │   └── ResultPanel.tsx
│   ├── lib/
│   │   ├── build.ts          # palace builder (three cases, progress, retryable steps)
│   │   ├── api.ts            # fetch to /api/* with timeouts and readable errors
│   │   ├── image.ts          # shrink photo on device
│   │   ├── speech.ts         # SpeechRecognition wrapper
│   │   ├── store.ts          # IndexedDB palaces
│   │   └── time.ts           # timers and "3:42" formatting
│   ├── examples/
│   │   ├── lists.ts
│   │   ├── rooms.json        # prepared objects per example room (+ model, date)
│   │   └── scenes.json       # prepared scenes per example room × list (+ model, date)
│   └── styles/
│       ├── tokens.css        # palette, type, motion tokens
│       └── app.css
├── public/
│   ├── rooms/                # kos.jpg, studio.jpg, kitchen.jpg (AI-generated examples)
│   ├── favicon.svg
│   └── og.jpg                # social card
├── scripts/
│   └── prebuild-examples.mjs # sends example rooms through the real helpers (local dev server) → src/examples/*.json
├── tests/                    # Vitest: score, list, route, validate, voice, store, contrast
├── e2e/                      # Playwright: example palace end to end, build flow + failures (stubbed), voice (fake recognizer), reload
├── devpost/                  # scope.md, prd.md, spec.md, checklist.md, app-map.html (learner-profile.md is git-ignored)
├── index.html
├── vite.config.ts            # React + dev API bridge, port 5174
├── vercel.json               # function time limits
├── package.json · tsconfig.json · vitest.config.ts · playwright.config.ts
├── .env.example              # GEMINI_API_KEY=, DEEPSEEK_API_KEY=, GEMINI_MODEL=
├── LICENSE                   # MIT
└── README.md
```

## External Services and Dependencies

### Gemini API (Google) — find objects; scene fallback
- **Call:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, header `x-goog-api-key: $GEMINI_API_KEY`.
- **Payload (objects):** `{ contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: <base64> } }, { text: <object instructions> }] }], generationConfig: { responseMimeType: "application/json", responseSchema: <array of {label, box_2d}>, temperature: 0.4 } }`.
- **Response:** `candidates[0].content.parts[].text` = JSON array of `{ label, box_2d: [ymin, xmin, ymax, xmax] }` normalised to 0–1000.
- **Docs:** https://ai.google.dev/gemini-api/docs/image-understanding · https://ai.google.dev/gemini-api/docs/structured-output · limits: https://ai.google.dev/gemini-api/docs/rate-limits
- **Key:** `GEMINI_API_KEY`. **Limits/cost:** free tier, per-model daily quotas (on 2026-10-04 `gemini-3.8-flash` returned 429 for the whole day and `gemini-3.7-flash` 503s, hence the ladder). On the free tier Google may use submitted content to improve its products — said in the privacy line.

### DeepSeek API — write scenes; objects fallback
- **Call:** `POST https://api.deepseek.com/chat/completions`, header `Authorization: Bearer $DEEPSEEK_API_KEY`.
- **Payload:** `{ model: "deepseek-flash", reasoning_effort: "low", response_format: { type: "json_object" }, messages: [{ role: "user", content: [{ type: "text", text }, { type: "image_url", image_url: { url: "data:image/jpeg;base64,…" } }?] }] }` (image only for the objects fallback).
- **Response:** `choices[0].message.content` = a JSON object string (`{"scenes": [...]}` or `{"anchors": [...]}`), code fences tolerated.
- **Docs:** https://api-docs.deepseek.com/ · **Key:** `DEEPSEEK_API_KEY` · **Cost:** paid per token; one palace's scenes are well under a cent. Measured 0.15 s (scenes) and 0.65 s (objects) in the spike.

### Web Speech API (browser)
- `new SpeechRecognition()`; `lang = "en-US"`, `continuous = true`, `interimResults = true`, `maxAlternatives = 5`; events `result`, `error`, `end`. Optional: `processLocally`, `phrases = [new SpeechRecognitionPhrase(item, 5)]`, `SpeechRecognition.available(...)`.
- In Chrome the default recognizer sends audio to Google's speech service; no key needed. Not available in Firefox; partial in Safari.
- **Docs:** https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition · https://webaudio.github.io/web-speech-api/

### Vercel (hosting)
- Static site from `dist/` + functions from `api/`. Request body limit 4.5 MB (a shrunk photo is ~0.4 MB as base64). `vercel.json`: `api/anchors.ts` maxDuration 60 s, `api/scenes.ts` 30 s. Env vars `GEMINI_API_KEY`, `DEEPSEEK_API_KEY` (production). Free hobby plan.
- **Docs:** https://vercel.com/docs/functions · https://vercel.com/docs/projects/environment-variables · https://vercel.com/docs/domains

### npm packages
`react`, `react-dom`, `idb-keyval`, `lucide-react`, `@fontsource-variable/piazzolla`, `@fontsource-variable/atkinson-hyperlegible-next`, `@fontsource/atkinson-hyperlegible-mono`; dev: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `fake-indexeddb`, `@playwright/test`, `@types/*`.

## Important Failure Modes

- **Gemini quota spent or overloaded (429/503)** → the helper moves down the ladder in seconds; if every provider fails: "Couldn't reach the AI to look at your photo." with Try again (photo and list kept, only the failed step repeats).
- **Too few usable objects** (bare wall, dark photo, a long list) → "Found 8 good spots for 12 items." → "Use the first 8 items" or "Try another photo". Two items never share an object.
- **Voice mishears a hard word** → shown as "Heard: …" and treated as "didn't catch that" (no penalty) unless it clearly matches another item; typing always works; on-device recognition with phrase hints where already available.
- **No speech support / microphone blocked** → typing only, with the PRD's message.
- **Storage blocked or full** → the palace still works for this visit, with a note.

## What Was Simplified and Why

- **Hash routes (`#/`, `#/p/<id>`)** instead of a router library — two screens don't need one, and static hosting needs no rewrites.
- **IndexedDB on the device** instead of accounts and a database — proves the idea and keeps room photos private. The fuller version would need sign-in, storage and sync.
- **Prepared example palaces** (made by the real helpers, labelled) instead of live calls for examples — instant for judges, and honest about how they were made.
- **The zoomed real object** instead of a generated picture per scene — no extra cost or wait; the scene text carries the strangeness.
- **The browser's speech-to-text** instead of a paid transcription service — free and built in; typing covers browsers without it.
- **No offline install (service worker)** — saved palaces already work without the network for learning and typed recall.

## Decisions and Open Issues

**Decisions** (all agent recommendations, accepted under the standing instruction):
- Vite + React + TypeScript; two Vercel functions; IndexedDB via idb-keyval; Web Speech API; Piazzolla + Atkinson Hyperlegible Next/Mono; lucide icons. *(answered by agent per learner's standing instruction)*
- Live on Vercel at loci.edycu.dev, so judges and classmates can try it; the video and repo remain the submission. *(answered by agent per learner's standing instruction)*
- Gemini for objects (tightest boxes in the spike), DeepSeek for scenes (fast and vivid in the spike), each with fallbacks; only names — never the photo — go to the scene writer. *(answered by agent per learner's standing instruction)*
- Route = shortest path from leftmost to rightmost stop; objects at least 7% of the diagonal apart (every spike room kept 13–15 at 7%). *(answered by agent per learner's standing instruction)*
- Answer checker allowances per word, plus the voice rule "unrecognisable is not wrong". *(answered by agent per learner's standing instruction)*

**One useful unknown — the learner's learning goal:** *"How does the checker decide that 'occulomotor' is close enough but 'optic' at the oculomotor stop is wrong — and is a spoken answer judged differently from a typed one?"*
- Clarified now with the allowance table (≤4 letters exact, 5–9 one change, 10+ two changes; per word; ≤3 in total) and the worked examples under **Answer checker**.
- Spoken answers use the same checker on each of the browser's guesses, plus a sound-key; the difference is only that an unrecognisable phrase isn't counted as wrong.
- Checked during the build by unit tests on the boundary cases (threshold exactly, threshold + 1, "Vitamin C/D", "Henry VII/VIII", "1. Olfactory" → "olfactory", empty answer, a 1-letter item) and revisited in the learning wrap-up by tracing one answer through `shared/score.ts`.

**Open:**
- Voice accuracy on hard words with a real microphone — the spike's automated probe was blocked on this machine; measure at the first hands-on checkpoint. *(carried from `prd.md > Open Questions`)*
- A real phone photo of a real room. *(carried from `prd.md > Open Questions`)*
- The demo list — the learner picks a never-studied list before recording. *(carried from `prd.md > Open Questions`)*

## Interview Record
Answers written by the agent from the learner's notes and the spike, per the standing instruction.

- **"Anything you want to use or learn technically?"** A familiar, well-documented stack is fine; my learning goal is the answer checker. → Vite + React + TypeScript recommended and accepted. *(answered by agent per learner's standing instruction)*
- **"Where should it run — just locally for the video, or a link others can open?"** A link others can open, so classmates and judges can try it: Vercel, loci.edycu.dev. *(answered by agent per learner's standing instruction)*
- **"In `prd.md > Saved palaces`, where should a palace live, and what happens when you come back?"** On my device only; it's still there tomorrow; the photo never sits on a server. → IndexedDB. *(answered by agent per learner's standing instruction)*
- **"In `prd.md > Building the palace`, which AI for objects and for scenes?"** Whatever the spike showed works best: Gemini for objects, DeepSeek for scenes, with fallbacks. *(answered by agent per learner's standing instruction)*
- **"Which part are you least sure about?"** How the checker decides close enough, and whether voice hears hard words. *(answered by agent per learner's standing instruction)*
- **Review — "Does this look good, or would you change anything?"** Looks good. *(answered by agent per learner's standing instruction)*
