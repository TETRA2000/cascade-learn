# Cascade — a Duolingo-style app for learning to code

A multi-course learning app (CSS and Rust so far). It started as a handoff from a CSS design prototype; the prototype in reference/ is still the source of truth for shared behavior (quiz engine, hearts, XP, feedback).

## What exists

| Path | What it is |
|---|---|
| `content/courses.json` | The course list, in picker order (`id`, `name`, `tagline`, `blurb`, `icon`). |
| `content/<course>/lessons.json` | Units and cards. CSS cards may have knob/choice playgrounds; Rust cards may have `code`/`rs-choice` demos. |
| `content/<course>/questions.json` | Practice questions. CSS: 7 types drawn with real CSS. Rust: 7 `rs-*` types. |
| `content/<course>/question-types.json` | That course's question types in difficulty order. |
| `content/<course>/topics.json` | Unit key → question ids for its "Practice this" quiz. |
| `scripts/check-rust.ts` | `npm run check:rust`: compiles Rust content against its authored answers. |
| `reference/design-canvas/Prototype.dc.html` | **The source of truth for behavior.** The complete working prototype (Learn + Practice tabs, all question types, hearts/XP, results screens). |
| `reference/design-canvas/{Main,Pairs,Versus,Build,Tune,Bug,Type}.dc.html` | One static design screen per question type (earlier exploration). |
| `reference/design-canvas/canvas.json` | Canvas layout + sticky notes explaining the design rationale. |
| `docs/design-rationale.md` | Why each question type exists and how they are sequenced. |
| `docs/design-tokens.md` | Colors, type, spacing, components. |
| `docs/content-schema.md` | Field-by-field schema for the JSON content. |

The `.dc.html` files are written for a design-canvas runtime (`support.js`, `<x-dc>`, `<sc-for>`, `<sc-if>`, `{{holes}}`, `class Component extends DCLogic`). **They will not run on their own.** Read them as a spec: the markup shows layout and inline styles; `renderVals()` and the class methods show every behavior. Do not try to ship or port that runtime.

## Stack

Vite + React + TypeScript, CSS Modules with the tokens in `docs/design-tokens.md`, Vitest, Playwright, GitHub Actions. Content is typed JSON behind `src/content` (`courseById`, `unitByKey(course, …)`, …); components never import JSON.

## Adding a course

1. Add its id to `COURSE_IDS` and its question-type keys to `TYPE_KEYS` in `src/content/typeKeys.ts`.
2. Add `content/<id>/` (four files) and an entry in `content/courses.json`, and bundle it in `src/content/index.ts`.
3. Add its question shapes to `src/content/types.ts`, a validator, a grader (`src/quiz/grade/`), feedback copy (`src/quiz/feedback/`) and renderers (`src/quiz/renderers/<id>/`). Exhaustive switches make `tsc` point at anything missing.

## Rules (all courses)

- Accessibility is part of the spec: real `<button>` elements, `aria-pressed` on selectable tiles/chips, `aria-live` on feedback, `role="progressbar"` with values, 44px minimum touch targets, text contrast ≥ 4.5:1, correct/incorrect never signaled by color alone (icons + text).
- Respect `prefers-reduced-motion` (the feedback slide-up is the only animation).
- Keep new content in the JSON files, not in components.

## CSS course

- Never inject user-typed text into CSS without sanitizing. The prototype strips everything except `[a-zA-Z-]` for the "Type the value" preview; keep that.
- `§` at the start of a code line marks an HTML line (render grey, strip the `§`).
- Live previews are real CSS from question data, never images.

## Rust course

- Answers are authored data; nothing runs Rust in the app.
- Every snippet must pass `npm run check:rust` (CI enforces it).
- Lines starting with `# ` are hidden setup (rustdoc convention), and displayed line numbers count visible lines only.
- Errors are written as rustc's first line: `error[E0382]: …`.
- Typed tokens are trimmed, whitespace-collapsed, case-sensitive, and at most 40 characters.

## Open questions for the user

- Accounts/sync, streaks, and a lesson map are not designed yet.
- The full Rust curriculum (12–15 units) is the next spec.
