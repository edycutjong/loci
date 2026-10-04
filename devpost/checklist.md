---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast *(answered by agent per learner's standing instruction: the learner asked for fast mode)*

## Slices

- [x] **1. Your own photo and list become numbered pins along a route**
  Becomes usable: Open the app, pick a room photo, paste a list, tap Build, and see numbered pins on real objects joined by a dotted route that starts at the left of the photo and ends at the right. No scenes yet.
  Why now: Risk and kernel first. It proves the object-finding helper, the route maker and the photo stage together on a real photo, and the scaffold comes with it.
  PRD ref: `prd.md > Starting a palace`, `prd.md > Building the palace`
  Spec ref: `spec.md > Find objects helper`, `spec.md > Route maker`, `spec.md > List parser`, `spec.md > Image shrinker`, `spec.md > Stage`, `spec.md > Dev API bridge`, `spec.md > Look and Feel`
  Build: Scaffold Vite + React + TypeScript on port 5174 with the tokens and self-hosted fonts; Home with the photo picker and list box; the list parser; the image shrinker; `shared/prompts.ts`, `validate.ts`, `providers.ts` and `api/anchors.ts` with the model ladder; the dev API bridge; `shared/route.ts` (choose objects, shortest left→right route, box → pixels); the Palace screen's building state with the Stage drawing pins and the route. Unit tests for list, route and validate.
  Verify (mechanical): `npm test` green (list, route, validate); `npm run build` green; `curl` POST of the kos photo to `/api/anchors` on the dev server returns ≥12 objects; a Playwright script uploads the kos photo with the 12 cranial nerves and confirms 12 pins inside the photo and a route path, saving a screenshot.
  Learner check: Open http://localhost:5174, pick a photo of your room, paste 12 items, tap Build, and check that each pin sits on a real object and the dotted line runs from left to right.
  Commit: `feat: build a route of pins on your own room photo`

- [x] **2. Learn: walk the route with a scene at each stop**
  Becomes usable: After the pins land, the scenes arrive; Learn moves from stop to stop, zooming toward each object, with a scene card (item, object, scene, sound-alike), Next/Back, swipe, arrow keys, tap-a-pin, All stops, a learn timer, and Start recall at the last stop.
  Why now: It completes the memorizing half of the kernel, and the scene writer is the second AI call and the second risk.
  PRD ref: `prd.md > Learning the route`, `prd.md > Building the palace`
  Spec ref: `spec.md > Write scenes helper`, `spec.md > Palace builder`, `spec.md > Scene card`, `spec.md > Stage`
  Build: `api/scenes.ts` with its ladder; `src/lib/build.ts` with two-step progress; Learn mode on the Palace screen; the Stage camera (zoom and pan per stop, pins counter-scaled); the Scene card with the item's words marked; learn timer; keyboard and swipe.
  Verify (mechanical): `npm test` green including scene validation; `curl` POST of 12 object+item pairs to `/api/scenes` returns 12 non-empty scenes; Playwright builds on the kos photo, reaches all 12 scene cards with Next and with ArrowRight, checks each card shows item, object and scene, and saves screenshots of stops 1 and 6.
  Learner check: Build a palace, step through every stop, and say whether the scenes are strange enough to stick.
  Commit: `feat: learn mode walks the route with a scene per stop`

- [x] **3. Recall by typing: lights out, green or red, result and retry**
  Becomes usable: Start recall: the photo goes dark, you type each item, right answers turn the pin green and light a pool of the room, wrong ones turn red. Result with first-try score and both times, the all-green moment, Relearn and Retry the misses, Copy result, Walk it again.
  Why now: It completes the kernel — the proof the palace works. Typing first because it works in every browser; voice reuses the same checker.
  PRD ref: `prd.md > Recalling — lights out`, `prd.md > Result and retrying misses`
  Spec ref: `spec.md > Answer checker`, `spec.md > Recall panel`, `spec.md > Result panel`, `spec.md > Stage`
  Build: `shared/score.ts` with its boundary tests; Recall mode state; the light-pool mask on the Stage; the Result panel; relearn/retry flows; Copy result; a polite live region announcing each result.
  Verify (mechanical): `npm test` green with the spec's boundary cases (threshold and threshold + 1, "Vitamin C"/"Vitamin D", "Henry VII"/"Henry VIII", "occulomotor", "1. Olfactory", empty answer, a 1-letter item, "oat milk"/"oatmilk"); Playwright on a built palace types 11 right and 1 wrong → 11 green pins, 1 red, "11 of 12 on the first try"; Retry the misses with the right answer → "12 of 12 after retry"; screenshot of the lit room.
  Learner check: Walk your palace by typing, miss one on purpose, retry it, and watch the room light back up.
  Commit: `feat: recall by typing with lights-out scoring and retries`

- [x] **4. Recall by voice: say the list and the pins light up**
  Becomes usable: In Chrome or Edge, one tap starts listening; each item you say turns its pin green and moves on by itself; "skip" or "pass" marks a miss; what was heard is shown; an unrecognisable phrase costs nothing; browsers without voice, or a blocked microphone, fall back to typing with a plain message.
  Why now: The eyes-closed recital is the demo's proof moment, and it builds directly on the checker from slice 3.
  PRD ref: `prd.md > Recalling — lights out`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Voice interpreter`, `spec.md > Speech listener`, `spec.md > Recall panel`
  Build: `shared/voice.ts` (phrase interpretation and sound keys) with tests; `src/lib/speech.ts` (continuous listening, self-restart, error mapping, phrase hints where on-device recognition is already available); the microphone UI in the Recall panel.
  Verify (mechanical): `npm test` green for voice (two items in one phrase, look-ahead skip, skip words, wrong order, already-answered ignored, not caught, no sound-key collisions inside each example list); Playwright with a fake `SpeechRecognition` injected says 12 phrases and gets 12 green pins with no typing; with `SpeechRecognition` removed, the typing-only message shows.
  Learner check: In Chrome, start recall, tap the microphone once, close your eyes, say the list, and open them to a row of green pins.
  Commit: `feat: recall by voice with continuous listening`

- [x] **5. Palaces stay on your device**
  Becomes usable: Every built palace and every finished walk is saved; Home lists them with the room thumbnail, title and last result; a palace reopens after a reload; delete asks first; if saving is blocked, a note says it won't be kept.
  Why now: Coming back before the exam is part of the loop, and the walk record's shape is only settled once recall exists.
  PRD ref: `prd.md > Saved palaces`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Palace store`, `spec.md > Palace list`, `spec.md > Data Model`
  Build: `src/lib/store.ts` on idb-keyval; save at the end of a build; append walks and retries; the Palace list on Home; hash routes `#/` and `#/p/<id>`; delete; the storage-failure fallback.
  Verify (mechanical): `npm test` green for the store with fake-indexeddb (save, list, add walk, delete removes both keys); Playwright builds a palace (AI stubbed), walks it, reloads, finds it on Home with its first-try result, opens it, deletes it, and sees it gone.
  Learner check: Build a palace, close the tab, open the app again, and find it on the home screen with your last score.
  Commit: `feat: save palaces and results on the device`

- [x] **6. Example rooms and lists: try it in seconds**
  Becomes usable: Three AI-generated example rooms and three example lists; an example room with an example list opens instantly (prepared in advance, labelled); an example room with your own list only waits for scenes.
  Why now: Judges and classmates can try the whole loop without a photo, and preparing the examples honestly needs the real helpers from slices 1–2.
  PRD ref: `prd.md > Starting a palace`, `prd.md > Building the palace`
  Spec ref: `spec.md > Examples`, `spec.md > Room picker`, `spec.md > List box`, `spec.md > Palace builder`
  Build: `public/rooms/*.jpg` (≤1280 px); `src/examples/lists.ts`; `scripts/prebuild-examples.mjs` through the local dev server → `rooms.json` and `scenes.json` with model and date; the builder's example cases; "AI-generated example" and "prepared in advance" labels.
  Verify (mechanical): the script reports 3 rooms with ≥12 objects each and 9 scene sets of the right length; Playwright taps the student room + Cranial nerves + Build and reaches stop 1 in under 2 seconds with zero `/api` calls; an example room + a custom list makes exactly one `/api/scenes` call.
  Learner check: On the home screen tap an example room and an example list, build, and walk the palace without any photo of your own.
  Commit: `feat: example rooms and lists ready in seconds`

- [x] **7. Honest failure states, accessibility and finish**
  Becomes usable: Too few spots → shorten the list or try another photo; AI unreachable → try again repeats only the failed step; unreadable photo → plain message; reduced motion; full keyboard use; checked contrast; phone and laptop layouts; favicon and social card.
  Why now: The proof of concept must not break in front of someone, and every state now has a real screen to attach to.
  PRD ref: `prd.md > States and Boundaries`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Important Failure Modes`, `spec.md > Look and Feel`, `spec.md > Palace builder`
  Build: the failure screens and retry-the-step logic; a contrast unit test over the tokens; reduced-motion handling; a focus and keyboard pass; a responsive pass at 390 px and 1440 px; themed browser surfaces; favicon and social card; a craft-floor design pass.
  Verify (mechanical): Playwright with stubbed failures: a 503 shows "Couldn't reach the AI…", then Try again succeeds without re-picking the photo; 8 objects for 12 items shows "Found 8 good spots…", and "Use the first 8 items" gives 8 pins; a non-image file shows its message; a reduced-motion run has no transitions; the contrast test is green; screenshots at 390 and 1440.
  Learner check: Try a photo of a bare wall with 12 items; you should be offered to shorten the list, never a broken screen.
  Commit: `feat: honest failure states, accessibility and polish`

- [x] **8. Live on the web**
  Becomes usable: Anyone can open the live link, build a palace from their own photo, and walk it.
  Why now: Last, because it ships what already works; outside testers and judges need a link.
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > External Services and Dependencies`
  Build: README (how to run, how it works, test counts), MIT LICENSE, `.env.example`, `vercel.json`; GitHub repo `edycutjong/loci` (private until submission) and push; Vercel project `devpost-learn-loci` with the two keys, the Git connection and a production deploy; domain `loci.edycu.dev`; canonical URL.
  Verify (mechanical): the production deploy succeeds; `curl` of the live `/api/anchors` with the kos photo returns ≥12 objects (a real AI call); Playwright against the live URL builds a palace from an uploaded photo and finishes a typed recall; the domain shows the DNS record Vercel needs.
  Learner check: Open the live link on your phone, build a palace from your room, and walk it.
  Commit: `chore: deploy to Vercel with README and license`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 3: the whole typed loop (own photo → pins → scenes → recall → result) in a real browser
  Done by the agent with a real browser run, per the learner's standing instruction (`e2e/live/handson-early.spec.ts`: studio flat, first 12 elements pasted with numbering and "Sodium / Na", real AI calls). Noticed: the loop works end to end; "Berylium" counted (one typo), "Floride" did not, "Na" counted; a skip and a miss gave 10 of 12; relearn → retry → 12 of 12 and the whole room lit. Change requested: in recall the floating object label covered neighbouring pins → removed in recall (the heading already names the object).
- [x] Final kick-the-tires exploration and feedback completed — after slice 8, on the live site, at phone and laptop sizes
  Done by the agent with a real browser on https://devpost-learn-loci.vercel.app, per the learner's standing instruction (`e2e/live/handson-final.spec.ts`): keyboard only from Home to all lit; awkward inputs (13 items, a 5-word item, one-letter items, "Sodium / Na"; "0" correctly not accepted for "O"); a reload mid-recall (the half walk is dropped, the palace stays); delete; and an own photo through the real AI at laptop size. Feedback: the Recall tab did nothing on the result screen → fixed. An independent design review followed (below).

## Final Review

- [x] From the result screen, the "Recall, lights out" tab starts a fresh walk (it did nothing before) — fixed, browser check added, retried on the live site
- [x] Independent design review (impeccable finish reviewer, fresh context) — verdict "fix" with 8 findings, all fixed: strip shows ticks and crosses (never colour alone); on a phone Learn gets a tall frame the camera fills, other modes shrink to the photo's shape; route lines keep one weight at any zoom; example rooms at their native 1536 px, your own photo kept at 2048 px, zoom capped by real resolution; four-step type scale plus one numeral size; hyphenated object names never break; square-ish controls and a solid top bar; a visible dim around the stop being learned. The Learn / Lights out switch moved into the top bar.
- [x] Narrow phones: a long "Next stop: the …" label widened the page at 320 px (sideways scroll) — fixed with minmax(0, 1fr) grid columns; a browser check now walks every learn and recall stop at 320, 360 and 390 px
- [x] Design review, round 2 (verdict pass on the fixes): 7 of 8 resolved; photo sharpness partial → the zoom now never shows more than 1.5 screen pixels per photo pixel (the example rooms top out at the generator's 1536 px, so a gentler zoom instead of an artificial upscale); three phone regressions fixed: the next-stop label wraps to two lines, the top bar keeps the palace name with a clock-icon timer and an icon mode switch below 480 px, and times never orphan at 320 px
- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Brief recap (focused alternative for a plan-first learner), tied to the stated learning goal, understanding the answer checker. The real moment: the planning notes first proposed one typo allowance for the whole answer; the spec's must-be-wrong pairs ("Vitamin C" vs "Vitamin D", "Henry VII" vs "Henry VIII") showed that rule would accept both, so the checker became per word with short words exact. Evidence: `tests/score.test.ts` ("needs short words exactly", "forgives up to the allowance and not one more", "never accepts a different item from the same list").
Route and stops: Reference route in the map, not toured live: `src/components/RecallPanel.tsx` (`onSubmit` → `onAnswer`) → `src/screens/Palace.tsx` (`isRight` → `respond()` → `commit()`) → `shared/score.ts` (`normalize`, `distance`, `allowance`, `closeEnough`, `isRight`) → `src/components/Stage.tsx` (`.pin[data-state="right"]`, `circle.pool`).
Edit outcome: not applicable (no edit, per the learner's standing instruction not to be asked questions).
Reflection: not offered (standing instruction: "No questions to me").
Activity mode: recap; the app map was rendered offline in a browser and every path and symbol checked against commit `f6b30fe`.

## Revisions
- Voice accuracy with a real microphone was not measured by the agent — automated Chrome on the build machine can't open a microphone (the planning spike hit the same wall). The interpreter is covered by unit tests and by browser checks that drive a stand-in recognizer; the learner's own voice is the remaining check.
- Sound-alike keys became a pure consonant skeleton and short keys must match exactly — the first version gave "hippo glossal" and "hypoglossal" different keys, and Hydrogen and Nitrogen nearly the same one.
- The three example photos were added to `public/rooms/` in slice 1 as the browser-check fixture, before slice 6 made them examples.
- The scene prompt now shows one worked example ("…honking 'Trochlear!'…"): with only a rule, DeepSeek dropped the exact item in 8 of 12 scenes when it used a sound-alike. The example script also re-asks up to 3 times until every scene names its item (all 9 prepared sets: every item named).
- Free-tier Gemini quotas ran out during the build day (`gemini-3.8-flash` then `gemini-3.5-flash` returned 429 on every key), so the example objects come from `gemini-3.1-flash-lite`, checked by eye on all three rooms; the scene ladder gained `gemini-3.5-flash` and a 45 s budget after one scenes call ran out of time.
- Home gained the hero the spec's first-viewport plan asked for: the student room's route demonstrating lights out and the room coming back, with a one-tap example.
- "Too few spots" keeps the objects already found, so "Use the first N items" re-plans instantly with no new AI call; "Try another photo" keeps the typed list for the tab.
- Disabled buttons use readable colours instead of 45% opacity — impeccable's detector measured the disabled Build label at about 1.3:1. Detector clean afterwards at 390 and 1280 px.
- Live on Vercel (`devpost-learn-loci`, deployed from GitHub `main`): https://devpost-learn-loci.vercel.app. Real calls on production: student room → 16 objects (gemini-3.1-flash-lite), 12 scenes (deepseek-flash); the live browser checks pass there (3 at that point, 7 after the final hands-on pass). `loci.edycu.dev` is attached and verified in Vercel and waits for one DNS record (A 76.76.21.21).
- Browser checks now look for pins inside the palace screen only: the home page's demo has its own 12 pins, which a live check briefly counted instead.
