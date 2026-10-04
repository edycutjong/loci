---
doc: prd
status: approved
---

# Loci — Product Requirements

Loci turns one photo of your own room into a memory palace for a list you must learn in order, then tests you on it: each item you remember switches a light back on in your dark room. For me first, then students learning ordered lists for exams.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

> The learner's standing instruction: "No questions to me. If a skill asks me something, answer for me — simple." The interview answers behind this PRD were written by the agent from the learner's planning notes and the approved scope. They are listed under **Interview Record**, each marked *(answered by agent per learner's standing instruction)*.

## The Core Journey
Develops `scope.md > The Core Loop` and `scope.md > What "Working" Looks Like`.

1. **Open Loci.** The home screen says what it does in one line and shows two things to pick: a room and a list. If I have saved palaces, they are listed first.
2. **Pick a room.** Take or choose a photo of my room, or tap one of three example rooms (AI-generated, labelled as such).
3. **Paste a list.** One item per line, in order, 3 to 12 items, 4 words or fewer each. Or tap an example list (12 cranial nerves, the first 12 elements, a grocery run). A counter shows how many items are ready.
4. **Build the palace.** One button. Progress is shown in two honest steps: "Finding objects in your room" and "Writing a scene for each stop". As soon as the objects are found, numbered pins drop onto them one by one and a dotted route draws itself from the left of the photo to the right.
5. **Learn.** The view walks the route: it moves to stop 1 and zooms toward the object, and a scene card shows the stop number, the item in large type, the object it sits on, a short vivid scene, and a sound-alike for hard words. Next and Back (or swipe, or arrow keys) walk to the next stop. Tapping any pin jumps there. A small timer counts the learning time.
6. **Recall — lights out.** When ready, I start recall. The photo goes dark; only the dotted route and the numbered pins stay, faintly. At each stop the app names the object ("Stop 3 · the single bed") and I say or type the item.
7. **Each answer is checked by the app, not the AI.** Right: the pin turns green and a pool of light brings that part of the room back. Wrong: the pin turns red and the room stays dark there. With the microphone on, I can say the whole list without touching the screen; the app moves to the next stop by itself.
8. **Result.** How many I got right on the first try, the learning time and the recall time, and the route with its green and red pins. If every pin is green, the whole room lights up again.
9. **Retry the misses.** Look at the missed scenes again, then recall only the red stops until all are green.
10. **Come back later.** The palace is saved on this device. From home I can learn it again or walk it again before the exam.

## Screens and Layout

Two screens. Develops `scope.md > The POC Boundary`.

- **Home.** Top: the name and one line of what it does. Then "Your palaces" (only if any exist): one row per palace with the room thumbnail, the list's title, and the last result. Then "New palace": the room picker (my photo, or one of three example rooms), the list box with example lists, and the Build button. On a phone everything is one column and the Build button stays reachable at the bottom.
- **Palace.** One screen with three modes: **Learn**, **Recall**, **Result**. The photo (the "stage") is on top on a phone and on the left on a wide screen; the mode panel is below it or beside it. A small header has Back to home, the list's title, and the Learn / Recall switch.

The building progress happens on the Palace screen, over the photo, so the pins appear where they will stay.

## Look and Feel
Develops `scope.md > Inspiration & Identity`.

- **The idea: lights out.** Learning happens with the lights on: my room photo, full colour, is the only bright thing on the screen. Recall happens with the lights off: the room goes dark and comes back one pool of light per remembered item. When every pin is green, the room is fully lit again. This is the one big motion moment; everything else is quiet.
- **Colours.** A deep night-blue background (a dark room at night, not pure black). Cool white text. Green means remembered; coral-red means missed. Nothing else competes with the photo. Pins also carry a mark (a tick, a cross), so colour is never the only signal.
- **Type.** A serif with character for the list items and headings, because the items are what I'm memorizing and should feel vivid. A very readable sans for everything else. Times and scores in clear, even-width numbers.
- **Feel.** Calm and focused, like studying in my room at night. Short plain copy. No confetti, points, streaks or badges.
- **Avoid.** Room to Speak's look (warm off-white, terracotta, rounded type). The generic AI-app look (purple gradients, glassy cards, neon glow edges). Cream paper and lamplight.

## Features and Behavior

### Starting a palace
Develops `scope.md > The Core Loop` (steps 1–2) and `scope.md > The POC Boundary`.

- As a student, I want to use a photo of my own room so the stops are places I see every day.
  - [ ] I can take a photo or choose one from my device.
  - [ ] I can instead tap one of three example rooms; each is labelled "AI-generated example".
  - [ ] A short note under the picker says where the photo goes: sent once to an AI to find objects, never stored on a server, kept on this device.
- As a student, I want to paste my list in order so the palace holds exactly what I must learn.
  - [ ] One item per line; blank lines and leading numbers like "1." are ignored.
  - [ ] I can add other accepted answers to an item with " / " (for example `Vestibulocochlear / auditory`). The first form is the one shown.
  - [ ] A counter shows "12 items". Fewer than 3 or more than 12 disables Build and says why.
  - [ ] An item longer than 4 words is marked inline: "Keep items to 4 words or fewer."
  - [ ] Tapping an example list fills the box; I can still edit it.

### Building the palace
Develops `scope.md > The Core Loop` (step 2) and `scope.md > The POC Boundary`.

- As a student, I want the app to find objects in my photo and connect them into a route so I don't have to plan a palace by hand.
  - [ ] Progress shows two named steps; the first ends when pins appear, the second when scenes are ready.
  - [ ] Pins sit on real, distinct objects; no two pins overlap; no object gets two items.
  - [ ] The route starts at the leftmost stop and ends at the rightmost, takes the shortest way between, and never crosses itself.
  - [ ] Item 1 is at stop 1, item 2 at stop 2, and so on.
  - [ ] Example room + example list opens instantly (prepared in advance, and labelled that way). Example room + my own list only needs the scenes step.

### Learning the route
Develops `scope.md > The Core Loop` (step 3).

- As a student, I want to walk the route once and read a strange scene at each stop so each item sticks to its object.
  - [ ] The view moves to the current stop and zooms toward its object; the current pin is marked.
  - [ ] The scene card shows: "Stop 3 of 12", the item in large type, "on the single bed", the scene (1–2 sentences) with the item's words picked out, and "Sounds like: truck-lear" when the item is abstract.
  - [ ] Next / Back buttons, swipe on a phone, and the left/right arrow keys all move between stops. Tapping a pin jumps to it.
  - [ ] An "All stops" view shows the whole route at once.
  - [ ] A small timer shows learning time; it starts when Learn opens.
  - [ ] At the last stop the main button becomes "Start recall". Recall can also be started at any time.

### Recalling — lights out
Develops `scope.md > The Core Loop` (steps 4–5) and `scope.md > What "Working" Looks Like`.

- As a student, I want to recall the list in order with the room dark so I know the palace is in my head, not on the screen.
  - [ ] The photo is hidden; only the route and numbered pins remain, faintly visible.
  - [ ] The current stop is marked and named: "Stop 3 · the single bed".
  - [ ] Typing: a text box (no autocorrect, no autocapitalise); Enter checks the answer.
  - [ ] Voice: one tap starts listening. Each phrase I say is checked against the current stop; a right answer turns the pin green and moves on by itself. Saying "skip" or "pass" marks the stop missed and moves on. If I say a later stop's item, the stops I skipped are marked missed. What the app heard is always shown.
  - [ ] Right answer: the pin turns green with a tick, and that part of the room lights up again.
  - [ ] Wrong answer: the pin turns red with a cross and the room stays dark there. The right answer is not shown yet.
  - [ ] Small typos and small mishearings still count (for example "occulomotor" for "oculomotor"). Very short items need an exact match. Accepted answers after " / " count too.
  - [ ] Every check is done by the app's own rules, never by an AI.
  - [ ] A small timer shows recall time, from the first stop to the last answer.

### Result and retrying misses
Develops `scope.md > The Core Loop` (step 5) and `scope.md > What "Working" Looks Like`.

- As a student, I want to see how I did and fix only what I missed.
  - [ ] The result shows "11 of 12 on the first try", the learning time and the recall time.
  - [ ] The route shows every pin green or red. If all are green, the whole room lights up once.
  - [ ] "Relearn the misses" shows only the missed stops' scenes. "Retry the misses" recalls only the red stops; a right answer turns them green.
  - [ ] After a retry the result also shows "12 of 12 after retry", without changing the first-try number.
  - [ ] "Copy result" copies one plain line: list size, first-try score, learning time, recall time, date.
  - [ ] "Walk it again" starts a fresh full recall.

### Saved palaces
Develops `scope.md > The POC Boundary` ("Palaces are saved on the device").

- As a student, I want my palace to still be there tomorrow so I can walk it again before the exam.
  - [ ] Closing and reopening the app shows the palace on home, with its room thumbnail, title and last result.
  - [ ] A custom list's title is its first and last item ("Olfactory → Hypoglossal"); an example list keeps its name.
  - [ ] I can delete a palace, after a confirm; its photo is removed from the device.

## States and Boundaries

- **First visit** — no palaces: home shows the new-palace form, the example rooms and lists, and a three-step "how it works" line. Nothing to dismiss.
- **Too few objects found** — "Found 8 good spots for 12 items." Two choices: "Use the first 8 items" or "Try another photo". Two items never share one object.
- **AI unreachable or too slow** — "Couldn't reach the AI to look at your photo." The photo and list stay; "Try again" repeats only the step that failed.
- **Photo can't be read** — "That file isn't a photo we can open. Try a JPG or PNG."
- **Voice not available in this browser** — the microphone button is replaced by "Voice isn't available in this browser — type your answers." Typing always works.
- **Microphone blocked** — "The microphone is blocked. Allow it in your browser, or type your answers."
- **Nothing heard / not understood** — "Didn't catch that — say it again, or type it." No penalty.
- **Offline** — building a palace needs the internet; learning and typed recall of a saved palace do not.
- **Can't save on this device** (storage full or blocked) — the palace still works now, with a note that it won't be kept.
- **Leaving mid-recall** — the walk is not kept; recall starts fresh next time. Finished walks and their results are kept.
- **Privacy boundary** — the photo is sent once to the AI to find objects, never stored on a server. Writing scenes uses only the object names and the list. Everything else stays on this device.

## Product Decisions

- **Recall by voice and by typing** — the eyes-closed recital is the moment that proves it works; typing keeps it working everywhere. *(answered by agent per learner's standing instruction)*
- **The app checks answers, not the AI** — the score has to be trustworthy. *(answered by agent per learner's standing instruction)*
- **Show the object's name as the cue in recall** — that is how the method works: you go to the place and see what's there. *(answered by agent per learner's standing instruction)*
- **Don't reveal the right answer on a miss** — relearn the scene, then retry; seeing the answer first makes the retry meaningless. *(answered by agent per learner's standing instruction)*
- **Route: leftmost to rightmost, shortest way** — from the spike; a pure left-to-right sort zigzagged. *(answered by agent per learner's standing instruction)*
- **Example rooms and lists, prepared in advance** — anyone (a judge, a classmate) can try it in seconds without a photo. *(answered by agent per learner's standing instruction)*
- **Look: lights out, night-blue, green and coral, a characterful serif for items** — the dark room coming back to light is the product's own picture of remembering. *(answered by agent per learner's standing instruction)*

## What We're Building
- Home with saved palaces and the new-palace form (own photo or example room; list box with example lists).
- Building: object finding, the route, scenes, with two-step progress.
- Learn: walk the route, scene cards, all-stops view, learning timer.
- Recall: lights out, voice and typing, green/red pins with marks, auto-advance, recall timer.
- Result: first-try score, times, all-green moment, relearn and retry the misses, copy result, walk again.
- Saved palaces on the device; delete.
- The failure messages under **States and Boundaries**.
- Works on a phone first, with keyboard use and reduced-motion support.

## Deferred From the POC
- **Accounts and sync across devices** — photos are private; local saving is enough to prove the idea.
- **Reminders to re-walk a palace** — needs notifications and a schedule; retention can't be shown in a short demo.
- **Long lists across several rooms** — a second flow; 12 items prove the idea.
- **Editing pins or regenerating a scene** — the first build accepts what it gets; a bland scene can be relearned.
- **A drawn picture per scene** — slow and costly per stop; the zoom on the real object already gives the picture.
- **Sharing a palace** — would need upload and links.
- **Installing as an offline app** — a saved palace already needs no network for learning and typed recall.

## Possible Later Enhancements
- Spaced reminders (tomorrow, 3 days, a week) using the saved results.
- A "hard mode" that hides the object names during recall.
- Several rooms in a row for longer lists.
- Better voice accuracy for unusual words by preparing the browser's speech engine with the list.

## Non-Goals
- **Claims about long-term memory** — only recall in one sitting is shown.
- **Sentence-length items** — matching full sentences fairly isn't possible here.
- **An AI deciding right or wrong** — never.
- **Points, streaks, confetti, leaderboards** — this is a study tool, not a game.
- **Keeping photos on a server** — the photo goes to the AI once and nowhere else.

## Open Questions
- **Which list for the demo video?** The builder picks a list they have never studied and writes it down before recording. *Can wait until the video.*
- **How well does the browser hear hard words?** Measured with a real microphone at the first hands-on check during the build. *Can wait for the build; typing covers it.*
- **A real phone photo of a real room.** The spike used AI-generated rooms. *Checked during the build.*

## Interview Record
Answers written by the agent from the learner's planning notes and the approved scope, per the standing instruction.

- **"In `scope.md > The Core Loop` you pick a photo and paste a list. What should someone see first?"** One line of what it does, then a room and a list to pick, with examples so it works in seconds; saved palaces first if there are any. *(answered by agent per learner's standing instruction)*
- **"What's on the screen while you learn, and how do you move?"** My photo moving from stop to stop, a card with the item, the object, a strange scene, a sound-alike for hard words; Next/Back, swipe, arrows, tap a pin. *(answered by agent per learner's standing instruction)*
- **"How would you know recall worked? What would you see?"** Pins turning green one by one while I say the list with my eyes closed, then a first-try score and two times. *(answered by agent per learner's standing instruction)*
- **Design beat — "What should it look and feel like?"** Night-time and focused: the room is lit while learning and dark during recall, coming back one light per remembered item; night-blue, white text, green and coral; a serif with character for the items, a very readable sans for the rest; not Room to Speak's look, not neon, not cream paper. *(answered by agent per learner's standing instruction)*
- **"What if the photo has too few things, the AI is down, or the mic doesn't work?"** Say so plainly and offer the way forward: shorten the list or change the photo; try again with my photo and list kept; type instead. *(answered by agent per learner's standing instruction)*
- **"What happens after a miss?"** Don't show the answer; let me look at the scene again and retry only the misses. *(answered by agent per learner's standing instruction)*
- **Review — "Does this look good, or would you change anything?"** Looks good. *(answered by agent per learner's standing instruction)*
