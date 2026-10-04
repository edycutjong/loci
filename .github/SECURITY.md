# Security policy

## Supported versions

| Version | Supported |
|---|---|
| `main` and the live site, loci.edycu.dev | ✅ |
| older releases | ❌ |

## Reporting a vulnerability

Please don't open a public issue. Report it privately instead:

- by email to **edy.cu@live.com**, or
- with GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
  (Security → Report a vulnerability).

You'll get a reply within 48 hours. Please allow a reasonable time for a fix before disclosing it.

## What Loci promises, and what checks it

| Promise | Checked by |
|---|---|
| The AI keys never reach the browser. Only the server helpers in `api/` read them. | `tests/keys.test.ts` builds the client with canary keys set and fails if any emitted file holds a key, a provider address or a key header. `e2e/judge.spec.ts` fails if the browser sends any request off the site. |
| No secret is ever committed. | `.github/workflows/gitleaks.yml` scans the whole git history on every push and every week. |
| The server keeps no photo. | `api/anchors.ts` sends the photo to the AI and returns objects; nothing is written anywhere. |
| An answer turns green only by the code's rules, never because an AI said so. | `shared/score.ts`, with `tests/score.property.test.ts` (60,000 generated answers per run). |

## In scope

- Anything that exposes a key, a photo, or a saved palace to someone it doesn't belong to.
- Ways to make the server helpers spend AI budget far beyond one person's normal use.
- Injection through the pasted list into the scene prompt that changes what the helpers do.

## Out of scope

- What the AI providers do with what they receive (see the README's Privacy section).
- Denial of service by volume against Vercel's own infrastructure.
