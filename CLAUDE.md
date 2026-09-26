# Cascade — a Duolingo-style app for learning CSS

This folder is a **handoff from a design prototype**. Nothing is built yet. Your job is to turn the prototype into a real app.

## What exists

| Path | What it is |
|---|---|
| `content/lessons.json` | 5 learning units, 19 cards. Each card has a title, body, optional live playground (`demo`) and a key-idea `tip`. |
| `content/questions.json` | 22 practice questions across 7 question types. |
| `content/question-types.json` | The 7 question types (key, display name, blurb), in difficulty order. |
| `content/topics.json` | Maps each unit key to the question ids used for its "Practice this" quiz. |
| `reference/design-canvas/Prototype.dc.html` | **The source of truth for behavior.** The complete working prototype (Learn + Practice tabs, all question types, hearts/XP, results screens). |
| `reference/design-canvas/{Main,Pairs,Versus,Build,Tune,Bug,Type}.dc.html` | One static design screen per question type (earlier exploration). |
| `reference/design-canvas/canvas.json` | Canvas layout + sticky notes explaining the design rationale. |
| `docs/design-rationale.md` | Why each question type exists and how they are sequenced. |
| `docs/design-tokens.md` | Colors, type, spacing, components. |
| `docs/content-schema.md` | Field-by-field schema for the JSON content. |

The `.dc.html` files are written for a design-canvas runtime (`support.js`, `<x-dc>`, `<sc-for>`, `<sc-if>`, `{{holes}}`, `class Component extends DCLogic`). **They will not run on their own.** Read them as a spec: the markup shows layout and inline styles; `renderVals()` and the class methods show every behavior. Do not try to ship or port that runtime.

## Suggested stack (confirm with the user before scaffolding)

- Vite + React + TypeScript, plain CSS modules or vanilla CSS with custom properties for the tokens in `docs/design-tokens.md`.
- Load `content/*.json` as typed data. Keep content out of components.
- Vitest for unit tests of grading logic; Playwright for a smoke test of one lesson and one quiz.
- Mobile-first, a 390px-wide phone layout that centers on desktop.

## Build order

1. **Types + content loading.** TypeScript types generated from `docs/content-schema.md`, loaded from the JSON.
2. **App shell.** Home with bottom tabs (Learn / Practice), hearts in the header.
3. **Learn flow.** Unit list → cards with Back / Next → last card offers "Done" or "Practice this" (starts a quiz with `topics[unitKey]`).
   Implement the playground engine (`demo.knobs` and `demo.kind: "choice"`) exactly as `demoVm()` in the prototype does. Note that `§` at the start of a code line marks an HTML line (render grey, strip the `§`).
4. **Quiz engine** (see `start`, `grade`, `check`, `next`, `resolvePair` in the prototype):
   - 5 hearts per lesson. A wrong answer costs 1 heart and re-queues the question at the end.
   - XP: +10 on first try, +5 when answered correctly after a miss.
   - Match pairs never costs hearts and auto-completes when all 4 pairs match. A wrong pair flashes for 700 ms.
   - Out of hearts → "Out of hearts" screen. Queue exhausted → results (XP, first-try %, hearts left).
   - Mixed review = one random question per type, in `question-types.json` order.
5. **The 7 question renderers**: predict, pairs, versus, build (word bank), tune, bug, type. Each is data-driven from `questions.json`. The live previews must be drawn with **real CSS** from the question data, never images.
6. **Feedback sheet**: slides up after Check; green/orange with icon + title, "Answer: …" line when wrong, explanation (backtick segments render as inline code), Continue.
7. **Persistence** (new — the prototype resets on reload): completed units, completed practice sets, total XP. Start with `localStorage`; keep it behind a small storage module so a backend can replace it.

## Rules

- Never inject user-typed text into CSS without sanitizing. The prototype strips everything except `[a-zA-Z-]` for the "Type the value" preview; keep that.
- Accessibility is part of the spec: real `<button>` elements, `aria-pressed` on selectable tiles/chips, `aria-live` on feedback, `role="progressbar"` with values, 44px minimum touch targets, text contrast ≥ 4.5:1, correct/incorrect never signaled by color alone (icons + text).
- Respect `prefers-reduced-motion` (the feedback slide-up is the only animation).
- Keep new content in the JSON files, not in components.

## Open questions for the user

- Stack confirmation (web vs. native mobile).
- Accounts/sync, streaks, and a lesson map are not designed yet.
- App name "Cascade" is a working title.
