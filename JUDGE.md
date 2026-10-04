# For judges

**Loci turns a photo of your own room into a memory palace for a list you must learn in order, then lights each stop back up as you say the list in the dark.**

This page is also on the site: [loci.edycu.dev/judge/](https://loci.edycu.dev/judge/) ([mirror](https://loci.edycu.dev/judge/)). Every number below links to where it came from.

## The 30-second path

No sign-up, no key, nothing to install. Any browser; a phone works.

1. Open [loci.edycu.dev](https://loci.edycu.dev) ([mirror](https://loci.edycu.dev)).
2. Tap **Try it: 12 cranial nerves**. A palace made in advance in an AI-generated student room opens at stop 1. No AI call, so no wait.
3. Tap **Next stop** a few times. Each stop is a real object in the photo, with a strange scene for its item.
4. Tap **Lights out** (the moon) and type what you remember. A right answer turns its stop green and lights that part of the room. "occulomotor" counts for Oculomotor; "Optic" at stop 5 stays dark.
5. Read the result, then retry the misses. First-try score, learning time and recall time. Every stop green brings the whole room back.

<details>
<summary>The 12 answers, in order</summary>

Olfactory · Optic · Oculomotor · Trochlear · Trigeminal · Abducens · Facial · Vestibulocochlear (or "auditory") · Glossopharyngeal · Vagus · Accessory · Hypoglossal

</details>

One more minute, with the real AI: on the home screen choose **Use your own room**, pick a photo, paste 3 to 12 items, and tap **Build my palace**.

## Receipts: a real run on the live site

On 2026-10-04, 19:44–19:47 UTC, [`scripts/receipt.mjs`](scripts/receipt.mjs) built 9 palaces on `devpost-learn-loci.vercel.app` the way a person does: the three AI-generated example rooms, each uploaded as if it were your own photo, times the three example lists. Full record: [DEMO.md](DEMO.md). Raw answers: [`public/judge/receipt-2026-10-04.json`](public/judge/receipt-2026-10-04.json).

| | Result |
|---|---|
| Palaces built | **9 / 9**, every one reached its first scene |
| Stops placed by code | **102**, on 142 objects the AI found |
| Scenes that spell their item | **102 / 102** |
| Wait, from "Build my palace" to the first scene | median **14.45 s**, slowest 30.02 s, upload included |
| Cost of all nine | **$0.1151** at list prices; **$0.0115** billed (DeepSeek); the Gemini part ran on a free-tier key |

Checks in the repo:

- **99 unit tests** ([`tests/`](tests)): the answer checker, the route, voice, storage, the model ladder, a no-key-in-the-browser build check, and regression tests named after the bugs they pin.
- **60,000 generated answers** per run ([`tests/score.property.test.ts`](tests/score.property.test.ts)): typed sloppily but right, they always count; one letter off a short word, or one change too many, they never do.
- **29 browser checks** ([`e2e/`](e2e)) on the production build with the AI and the microphone stubbed, including this page and its 30-second path.
- **7 live checks** ([`e2e/live/`](e2e/live)) with the real AI, also run on the live site.

## Reproduce

The real run. It needs no key, because the live site's server makes the AI calls:

```sh
git clone https://github.com/edycutjong/loci && cd loci
npm ci && npx playwright install chromium
npm run receipt     # 9 palaces on the live site → public/judge/receipt-<date>.json
```

The tests, a separate deterministic replay with the AI stubbed (what CI runs on every push):

```sh
npm test            # unit tests and the 60,000 generated answers, no network
npm run e2e         # browser checks on the production build
```

## Honest limits

1. **Recall in one sitting, nothing more.** Loci shows a first-try score, learning time and recall time. It makes no claim about next week and has no spaced repetition.
2. **The receipt's rooms are AI-generated.** Real rooms are messier. When free-tier Gemini quotas run out, objects come from `gemini-3.1-flash-lite`, which draws looser boxes.
3. **Voice is Chrome and Edge only.** It uses the browser's own speech recognition. Automated Chrome can't open a microphone, so voice is tested with a stand-in recognizer; typing works everywhere.
4. **Your photo goes to an AI once.** Gemini, or DeepSeek if Gemini is busy, sees it to find objects; the server keeps nothing. A free-tier Gemini key lets Google use what it receives, so leave people and papers out.

## Links

- **App:** [loci.edycu.dev](https://loci.edycu.dev) · mirror [loci.edycu.dev](https://loci.edycu.dev)
- **Story page and pitch deck:** [/story/](https://loci.edycu.dev/story/) · [/deck/](https://loci.edycu.dev/deck/)
- **Code:** [github.com/edycutjong/loci](https://github.com/edycutjong/loci) (MIT)
- **Plan, made with the Devpost Learn skill pack:** [scope](devpost/scope.md) · [PRD](devpost/prd.md) · [spec](devpost/spec.md) · [build log](devpost/checklist.md)
- **Event:** [Build With AI: Basics](https://learn-ai-basics.devpost.com/) (Devpost Learn)
