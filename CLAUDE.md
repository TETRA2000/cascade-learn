# Cascade — a Duolingo-style app for learning to code

A multi-course learning app (CSS, Rust and TypeScript so far). It started as a handoff from a CSS design prototype; the prototype in reference/ is still the source of truth for shared behavior (quiz engine, hearts, XP, feedback).

## What exists

| Path | What it is |
|---|---|
| `content/courses.json` | The course list, in picker order (`id`, `name`, `tagline`, `blurb`, `icon`). |
| `content/<course>/lessons.json` | Units and cards. CSS cards may have knob/choice playgrounds; a code course's (Rust, TypeScript) cards may have `code`/`code-choice` demos. |
| `content/<course>/questions.json` | Practice questions. CSS: 7 types drawn with real CSS. Rust: 7 `rs-*` types. TypeScript: 8 `ts-*` types. |
| `content/<course>/question-types.json` | That course's question types in difficulty order. |
| `content/<course>/topics.json` | Unit key → question ids for its "Practice this" quiz. |
| `src/lib/codeLang.ts`, `src/lib/code.ts` | The shared "code" engine behind Rust and TypeScript: `CodeLang`, `LANG` (per-language compiler name, error title/pattern, highlighter), `courseLang`/`langOfKey`, and language-neutral snippet helpers (hidden lines, visible line numbers, `findWord`, diff/slot helpers) reused by the app and by both content checkers. |
| `src/quiz/renderers/code/`, `src/quiz/grade/code.ts`, `src/quiz/feedback/code.ts` | Shared renderers, grading and feedback for every `rs-*`/`ts-*` question type, dispatched with paired switch cases (`case 'rs-foo': case 'ts-foo':`). |
| `scripts/check-rust.ts` | `npm run check:rust`: compiles Rust content against its authored answers. |
| `scripts/check-ts.ts`, `scripts/code-check-lib.ts`, `scripts/tsc-lib.ts` | `npm run check:ts`: type-checks every TypeScript snippet with the pinned `tsc`, then runs the ones that type-check on Node, and checks both against the authored output, error or throw. `code-check-lib.ts` is shared with `check-rust.ts`. |
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
2. Add its icon: a name in `COURSE_ICON_NAMES` (`src/content/typeKeys.ts`), an SVG in `src/components/icons.tsx`, and a case for it in `CourseIcon`'s switch there (it has an explicit `ReactElement` return type and no `default`, so a missing case fails `tsc`).
3. Add `content/<id>/` (four files) and an entry in `content/courses.json`, and bundle it in `src/content/index.ts`.
4. Add its question and demo shapes to `src/content/types.ts`, family guards for them in `src/content/guards.ts`, a validator, a grader (`src/quiz/grade/`), feedback copy (`src/quiz/feedback/`) and renderers (`src/quiz/renderers/<id>/`). **A course with authored code answers** (like Rust and TypeScript) shares the "code" family instead of writing its own: add a highlighter (`src/lib/highlightRust.ts`/`highlightTs.ts`-style), a `LANG` entry and a `courseLang`/`langOfKey` case in `src/lib/codeLang.ts`, then a paired key case (`case 'rs-foo': case 'xx-foo':`) in each exhaustive switch across `src/content/validateCode.ts`, `src/quiz/grade/code.ts`, `src/quiz/feedback/code.ts`, `src/quiz/renderers/code/CodeQuestionBody.tsx` and `scripts/code-check-lib.ts`, plus its own compiler adapter (`scripts/check-<id>.ts`, an npm script and a CI job — see `scripts/check-ts.ts`/`scripts/tsc-lib.ts` for the pattern).
5. `src/screens/Learn.tsx` branches on `isCodeDemo`, not per course, so a code course's Learn playground already works through `CodePlayground`/`courseLang` — no new branch needed there unless the course adds a genuinely new demo shape.
6. Exhaustive switches (explicit return types, no `default`) make `tsc` point at anything missing across all of the above.

## Rules (all courses)

- Accessibility is part of the spec: real `<button>` elements, `aria-pressed` on selectable tiles/chips, `aria-current` on the active course, `aria-live` on feedback, `role="progressbar"` with values, 44px minimum touch targets, text contrast ≥ 4.5:1, correct/incorrect never signaled by color alone (icons + text).
- Respect `prefers-reduced-motion` (the feedback slide-up is the only animation).
- Keep new content in the JSON files, not in components.

## CSS course

- Never inject user-typed text into CSS without sanitizing. The prototype strips everything except `[a-zA-Z-]` for the "Type the value" preview; keep that.
- `§` at the start of a code line marks an HTML line (render grey, strip the `§`).
- Live previews are real CSS from question data, never images.

## Rust course

- Answers are authored data; nothing runs Rust in the app.
- Every snippet must pass `npm run check:rust` (CI enforces it, via the `rust-content` job).
- Lines starting with `# ` are hidden setup (rustdoc convention), and displayed line numbers count visible lines only.
- Errors are written as rustc's first line: `error[E0382]: …`.
- Typed tokens are trimmed, whitespace-collapsed, case-sensitive, and at most 40 characters.
- Rust content never uses `thrown`/`throws`; the validator rejects it there (TS-only, see below).

## TypeScript course

- Answers are authored data; nothing runs TypeScript (or JS) in the app.
- Every snippet — including every `ts-infer` answer's inserted assertion — must pass `npm run check:ts` (CI enforces it via the `ts-content` job), which type-checks with `typescript` pinned exactly to `7.0.2` under `strict: true`, `target: es2023`, `lib: ["es2023"]`, `types: []`, `module: nodenext`, `noEmitOnError: false`, `pretty: false` (`noUncheckedIndexedAccess` stays off).
- Every type-checking snippet is also **run on Node**, so content must never read a `declare`d or uninitialized value at runtime. `console` (`log`/`error`) is the only global: no DOM, no other Node APIs, no async, and no generics/classes/modules (later curriculum).
- Outputs are exactly what Node's `console.log` prints (`{ a: 1 }`, `[ 1, 2 ]`, objects over ~72 chars wrap across lines).
- Errors are written as tsc 7.0.2's exact first line, e.g. `error TS2322: Type 'string' is not assignable to type 'number'.`. `check:ts` compares only the error code, so verify the full text by running the pinned `tsc` (flags in `scripts/tsc-lib.ts`'s `TSCONFIG`) on a scratch `.mts` file before authoring.
- `thrown` is Node's `String(error)` for an uncaught value, e.g. `TypeError: Cannot read properties of undefined (reading 'toUpperCase')`. `thrown`/`throws` are TS-only; the validator rejects them in Rust content. `thrown` never appears with `error`, but may appear with `output` (the program printed that, then threw).
- Lines starting with `# ` are hidden setup (rustdoc's convention, reused here), and displayed line numbers count visible lines only.
- Typed tokens (`ts-type`) are trimmed, whitespace-collapsed, case-sensitive, and at most 40 characters, same as Rust. For `ts-type` and `ts-build`, make sure no other reasonable token also satisfies the prompt as written — try alternative tokens against `tsc` before authoring; there's no second defensible answer.
- `ts-infer` ("Hover the type"): `line` must be a visible line where `name` already has the type being asked about, and that line must not itself narrow or reassign `name` (never an `if (typeof …) {` line or an early-return narrowing line) — `check:ts` inserts its `__Eq` assertion *right after* `line`, so a narrowing line would prove the wrong thing. The prompt names both the identifier and the line (e.g. "What type does the editor show for `x` on line 4?"). An option whose type text doesn't resolve on its own (a typo) still fails `check:ts`, via a per-option validity snippet.
- Exact option texts: a `ts-predict` error option reads `Type error`, a `throws` option reads `Throws at runtime` (Rust's is `Doesn’t compile`, curly apostrophe U+2019); at most one `error` option and one `throws` option per question.
- Labels are exact: code regions are `Rust code` / `TypeScript code`; feedback blocks read `rustc says` / `tsc says` / `Node says`; `OutputPanel` regions are `Output`, `Compiler error` and `Runtime error`, with titles `Doesn’t compile` / `Type error` / `Throws at runtime`.

## Open questions for the user

- Accounts/sync, streaks, and a lesson map are not designed yet.
- The full Rust curriculum (12–15 units) is the next spec.
- The TypeScript course has 4 units (Values & equality, Objects & arrays, Functions, Unions & narrowing); async, generics, classes and modules are out of scope until the next TS spec.
