# Contributing to Loci

Thanks for wanting to make Loci better. It is a small proof of concept, so small, focused changes are the easiest
to take.

## Set up

Needs Node 22 or newer.

```sh
git checkout -b fix/your-change
npm ci
cp .env.example .env.local   # optional: GEMINI_API_KEY and/or DEEPSEEK_API_KEY, for building your own palaces
npm run dev                  # http://localhost:5174
```

Without a key everything works except building a palace from a new photo. The one-tap example and the example rooms
with example lists open without any AI call.

## Before you open a pull request

- `npm run typecheck` and `npm test` pass (unit, regression, property and no-key tests).
- `npm run e2e` passes (browser checks on the production build, with the AI and the microphone stubbed).
- A behaviour change comes with a test. A bug fix comes with a regression test named after the bug, like the ones
  in `tests/regressions.test.ts` and `e2e/regressions.spec.ts`.
- Commits follow the conventional style: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.

## Three rules the code keeps

1. **Code decides, the AI proposes.** The AI finds objects and writes scenes. Which objects become stops, the order
   of the route, and whether an answer is right are plain code in `shared/`. Keep it that way.
2. **Keys stay on the server.** Only `api/*.ts` reads `GEMINI_API_KEY` and `DEEPSEEK_API_KEY`. Browser code never
   reads the environment; `tests/keys.test.ts` checks this on every run. Never commit a key.
3. **Photos stay private.** The photo goes to the AI once and is never stored on a server. Palaces live in the
   browser. Don't add logging or storage that keeps a photo.

## The public pages

`public/story/`, `public/deck/`, `public/judge/` and `public/404.html` are generated files. Open an issue describing
the change rather than editing them by hand.

## Bugs and ideas

Use the issue templates. For a bug, say what you did, what you expected and what happened, plus the browser and
device. Please don't attach a photo of a real room with people or private papers in it.
