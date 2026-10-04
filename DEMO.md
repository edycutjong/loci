# DEMO: the real run

Loci's judged capability is the build: a photo of your room and a list go in, and a palace comes out. An AI finds the objects ([`api/anchors.ts`](api/anchors.ts)), plain code picks the stops and orders the route ([`shared/route.ts`](shared/route.ts)), and an AI writes one scene per stop ([`api/scenes.ts`](api/scenes.ts)).

This file records that build on the live site, through the real app, with nothing stubbed.

## The run

- **When:** 2026-10-04, 19:44:45 to 19:47:32 UTC (2026-10-05, 02:44 to 02:47 in Jakarta). Nine palaces, one after another.
- **Where:** `https://devpost-learn-loci.vercel.app`, the production deployment of commit `386829c`. Requests entered Vercel in Singapore (`sin1`) and the functions ran in US East (`iad1`), as each answer's `x-vercel-id` header shows.
- **How:** [`scripts/receipt.mjs`](scripts/receipt.mjs) (`npm run receipt`) opens the app in Chromium 153 and does what a person does:
  - it uploads one of the three AI-generated example rooms as if it were your own photo, so none of the objects or scenes prepared for the examples are used;
  - it pastes one of the three example lists and clicks **Build my palace**;
  - it waits for the first scene.
- **The photo sent:** the app shrank each photo as it does for anyone, to a JPEG with a longest side of 1280 px. That is 853 × 1280 for the student room and 1280 × 853 for the other two, 156 to 199 KB.
- **Raw answers:** [`public/judge/receipt-2026-10-04.json`](public/judge/receipt-2026-10-04.json), also served at `/judge/receipt-2026-10-04.json`. It holds every object and box, every route, every scene, each model's time and tokens, and why any model was passed over.

## The nine palaces

| Room × list | Photo sent | Objects found | Passed over first | Stops | Scenes that spell their item | Wait | List price |
|---|---|---|---|---|---|---|---|
| Student room × 12 cranial nerves | 853×1280, 156 KB | 16 · `gemini-3.5-flash` 7.4 s | gemini-3.8-flash HTTP 503 | 12 | 12/12 · `deepseek-flash` 16.8 s | 28.00 s | $0.0230 |
| Student room × First 12 elements | 853×1280, 156 KB | 16 · `gemini-3.8-flash` 4.7 s | — | 12 | 12/12 · `deepseek-flash` 8.1 s | 14.43 s | $0.0076 |
| Student room × Grocery run | 853×1280, 156 KB | 16 · `gemini-3.8-flash` 4.9 s | — | 10 | 10/10 · `deepseek-flash` 7.3 s | 13.94 s | $0.0077 |
| Studio flat × 12 cranial nerves | 1280×853, 199 KB | 16 · `gemini-3.1-flash-lite` 6.3 s | gemini-3.8-flash HTTP 429; gemini-3.5-flash HTTP 429 | 12 | 12/12 · `deepseek-flash` 9.9 s | 17.97 s | $0.0029 |
| Studio flat × First 12 elements | 1280×853, 199 KB | 16 · `gemini-3.5-flash` 7.9 s | gemini-3.8-flash HTTP 429 | 12 | 12/12 · `deepseek-flash` 7.4 s | 16.95 s | $0.0236 |
| Studio flat × Grocery run | 1280×853, 199 KB | 16 · `gemini-3.5-flash` 8.0 s | gemini-3.8-flash HTTP 429 | 10 | 10/10 · `deepseek-flash` 3.6 s | 13.43 s | $0.0247 |
| Kitchen × 12 cranial nerves | 1280×853, 174 KB | 16 · `gemini-3.1-flash-lite` 3.2 s | gemini-3.8-flash HTTP 429; gemini-3.5-flash HTTP 429 | 12 | 12/12 · `deepseek-flash` 8.4 s | 13.92 s | $0.0027 |
| Kitchen × First 12 elements | 1280×853, 174 KB | 16 · `gemini-3.1-flash-lite` 2.3 s | gemini-3.8-flash timed out; gemini-3.5-flash HTTP 429 | 12 | 12/12 · `deepseek-flash` 10.8 s | 30.02 s | $0.0030 |
| Kitchen × Grocery run | 1280×853, 174 KB | 14 · `gemini-3.5-flash` 7.0 s | gemini-3.8-flash HTTP 429 | 10 | 10/10 · `deepseek-flash` 5.5 s | 14.45 s | $0.0199 |

**9 / 9 palaces built · 142 objects found · 102 stops · 102 / 102 scenes spell their item · median wait 14.45 s, slowest 30.02 s · $0.1151 at list prices, of which $0.0115 was billed**

- **Wait** is what a person waits for: the upload, Vercel's routing, every model tried, the route, and the scenes, from the click to the first scene on screen.
- **Stops** are chosen by code from the objects found: distinct, not crowded, then the shortest route from the leftmost stop to the rightmost. On the student room with the cranial nerves, the route ran yellow raincoat → blue bed → orange cat plush → wall clock → cork board → yellow desk lamp → black backpack → striped rug → snake plant → red kettle → guitar → globe.
- **Spell their item** means the scene contains the item exactly as written in the list. For example, at stop 4 of that palace: *"Your wall clock sprouts wheels and becomes a little truck-lear, honking 'Trochlear!' as it circles your room."*

## Which model answered, and why

Finding objects tries `gemini-3.8-flash`, then `gemini-3.5-flash`, then `gemini-3.1-flash-lite`, then `deepseek-flash`, within 55 seconds. Writing scenes tries `deepseek-flash` first.

| Step | Answered | Passed over |
|---|---|---|
| `gemini-3.8-flash` | 2 of 9 | 7 times: HTTP 429 five times (free-tier quota), HTTP 503 once (overloaded), timed out once at its 15 s limit |
| `gemini-3.5-flash` | 4 of 9 | 3 times: HTTP 429 (free-tier quota) |
| `gemini-3.1-flash-lite` | 3 of 9 | never asked to step aside |
| `deepseek-flash` (scenes) | 9 of 9 | never |

The slowest palace, the kitchen with the elements (30.02 s), is the one where `gemini-3.8-flash` used its whole 15 seconds before the ladder moved on. The ladder kept every palace building while two models ran out of quota.

## Tokens and cost

Each answer reports the tokens every model used, as its provider counted them (the `usage` field). The script prices them at the providers' published rates, checked on 2026-10-05 ([DeepSeek](https://api-docs.deepseek.com/quick_start/pricing), [Gemini](https://ai.google.dev/gemini-api/docs/pricing)):

| Model | Calls | Input tokens (cached) | Output tokens | Rate per 1M tokens | List price |
|---|---|---|---|---|---|
| `gemini-3.8-flash` | 2 | 2,682 | 2,933 | $0.75 in, $3.75 out | $0.0130 |
| `gemini-3.5-flash` | 4 | 5,364 | 8,720 | $1.50 in, $9.00 out | $0.0865 |
| `gemini-3.1-flash-lite` | 3 | 4,023 | 2,059 | $0.25 in, $1.50 out | $0.0041 |
| `deepseek-flash` | 9 | 4,812 (1,408) | 18,303 | $0.15 in, $0.003 cached, $0.60 out (off-peak) | $0.0115 |
| **All nine palaces** | 18 | | | | **$0.1151** |

- **Billed: $0.0115.** DeepSeek charges per token, and the run fell in its off-peak hours (a Sunday). The Gemini calls ran on a free-tier key, so they were not billed; at Google's paid rates they would have cost $0.1036.
- Output tokens include each model's reasoning, which is most of them. That is why `gemini-3.5-flash`, which thinks the longest, costs the most at paid rates.
- Per palace: about $0.0013 billed, and about $0.013 if every model were paid for.

## Reproduce it

The real run needs no key: the live site's server makes the AI calls.

```sh
npm ci && npx playwright install chromium
npm run receipt                                   # the 9 palaces above, on the live site → public/judge/receipt-<date>.json
BASE_URL=http://localhost:5174 npm run receipt    # the same, on your own dev server with your own keys
```

One call to the object finder, with `curl` and `jq`:

```sh
curl -s https://devpost-learn-loci.vercel.app/rooms/kos.jpg | base64 | tr -d '\n' | jq -Rs '{image: .}' \
  | curl -s https://devpost-learn-loci.vercel.app/api/anchors -H 'Content-Type: application/json' -d @- \
  | jq '{model, ms, tried, usage, objects: [.anchors[].label]}'
```

This sends the example photo at its full 1024 × 1536 size, where the app would send 853 × 1280, so the token count is a little higher.

## What this is not

- **Not the tests.** CI runs the unit, property and browser tests with the AI stubbed, so they need no key (see the README). The numbers in this file come from the live product.
- **Not real rooms.** The three photos are AI-generated, made for the examples; their generation prompts are embedded in the image files. A real, messier room is the next thing to measure.
- **Not recall.** The script builds palaces; it remembers nothing. Remembering is the person's part, and the app's result screen measures it: first-try score, learning time and recall time.
