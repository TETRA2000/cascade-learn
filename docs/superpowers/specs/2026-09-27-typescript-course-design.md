# TypeScript course + shared code-question engine — design

Status: approved in brainstorming 2026-09-27, awaiting spec review
Scope: turn the Rust question engine into a language-parameterized "code" engine, then add a TypeScript course on it: 8 question types, a `check:ts` content checker in CI, and 4 units.
Builds on: `2026-09-26-multi-course-rust-design.md` (course folders, exhaustive dispatch, `check:rust`).

## 1. Intent

**Stated by the user**
- Add a TypeScript course.
- Audience: programmers who know other languages but are not familiar with JavaScript or TypeScript.

**Decisions (confirmed in brainstorming)**
| Decision | Choice |
|---|---|
| Release scope | Platform plus 4 units (not a one-unit starter, not the full curriculum) |
| Units | Values & equality, Objects & arrays, Functions, Unions & narrowing |
| Question types | The 7 Rust shapes as `ts-*` keys, plus `ts-infer` ("Hover the type") |
| Architecture | One shared code-question engine for Rust and TS, with course-prefixed keys (approach A) |
| Grading | Authored answers only, as in Rust. Nothing runs in the app. CI checks every snippet with the pinned `tsc` and runs it on Node |

**Assumptions**
- The learner can program (variables, loops, functions, some static typing) but doesn't know JS semantics: `===`, `null`/`undefined`, truthiness, objects by reference.
- Programs are checked with `--strict`. `noUncheckedIndexedAccess` stays off, matching what learners meet in most real projects; unit 2 teaches the consequence.
- Output means what Node's `console.log` prints (`{ a: 1 }`, `[ 1, 2 ]`).
- No DOM, Node or browser APIs beyond `console`. No async, generics, classes or modules in this release.
- Hearts, XP, re-queueing, mixed review and the feedback sheet behave as in every other course.

**Success criteria**
- A new learner picks TypeScript, works through all 4 units and their "Practice this" quizzes, and switches courses from Home.
- Every TS snippet passes `npm run check:ts`, and `check:rust` still passes unchanged.
- CI (`check`, `e2e`, `rust-content`, `ts-content`) is green. Existing CSS and Rust tests pass, apart from moved files and renamed imports.

**Out of scope:** the full TS curriculum (async, generics, classes, modules, type-level programming), running TS in the app, DOM/browser APIs, a Python/Go course, accounts, streaks, a lesson map.

## 2. Shared code-question engine

The Rust family is refactored first, as its own step with no visible change.

### Keys
- `RUST_TYPE_KEYS` is unchanged.
- `TS_TYPE_KEYS = ['ts-predict', 'ts-pairs', 'ts-infer', 'ts-compiles', 'ts-build', 'ts-error', 'ts-fix', 'ts-type']` (difficulty order; `content/ts/question-types.json` must match).
- `COURSE_IDS` gains `'ts'`, `COURSE_ICON_NAMES` gains `'ts'`, and `TYPE_KEYS.ts = TS_TYPE_KEYS`. These land with the content (§9 step 5), so no course id exists without a bundle; until then `TS_TYPE_KEYS` and the TS shapes exist on their own.
- Stored progress and every `question-types.json` keep their keys. Nothing is migrated.

### Shapes (`src/content/types.ts`)
- Each shared shape is generic over its key, e.g. `CodePredictQuestion<K extends 'rs-predict' | 'ts-predict'>`. The shared shapes are predict, pairs, compiles, build, error, fix and type.
- The Rust names stay as aliases (`RustPredictQuestion = CodePredictQuestion<'rs-predict'>`), so Rust call sites barely change.
- Predict's option `kind` union is per key: Rust keeps `'output' | 'error'`, and TS adds `'throws'` (§3).
- `TsQuestion` is the 7 shared shapes with `ts-` keys plus `TsInferQuestion`. `CodeQuestion = RustQuestion | TsQuestion`, and `Question = CssQuestion | CodeQuestion`.

### Language profile (`src/lib/codeLang.ts`)
- `CodeLang = 'rust' | 'ts'`.
- `LANG: Record<CodeLang, …>` holds the compiler name for the feedback label (`rustc`, `tsc`), the compile-error title (`Doesn’t compile`, `Type error`), the highlighter, and the error-string pattern (`^error\[E\d{4}\]: `, `^error TS\d+: `).
- `langOf(q: CodeQuestion)` reads the key prefix. `courseLang(courseId)` returns the lang for a code course, or `null` for CSS.
- `src/lib/rustCode.ts` becomes `src/lib/code.ts`: the hidden-line, blank, slot and diff helpers are language-neutral. It stays free of imports so Node can run it directly.

### Dispatch
- `src/quiz/renderers/rust/Rust*.tsx` move to `src/quiz/renderers/code/Code*.tsx` and read their lang with `langOf`. `CodeInfer.tsx` is new.
- `CodeQuestionBody` switches on `q.type` with paired cases (`case 'rs-predict': case 'ts-predict':`), with an explicit return type and no `default`, so a missing key fails `tsc`.
- `grade/rust.ts` → `grade/code.ts` and `feedback/rust.ts` → `feedback/code.ts`, with the same paired switches.
- Guards: `isRustQuestion` → `isCodeQuestion` (key starts with `rs-` or `ts-`), and `isRustDemo` → `isCodeDemo`. `isPairs` and `isBuild` gain the `ts-` keys.

### Demos
- `code` demos are already language-neutral.
- `rs-choice` is renamed `code-choice` (`content/rust/lessons.json` is updated; content only, no stored state). The lang comes from the course.
- `validateDemo`: CSS cards may use knob and `choice` demos only; code courses may use `code` and `code-choice` only.

## 3. TypeScript question types

**Shared rules.**
- Code arrays are plain TS. Lines starting with `# ` (or a lone `#`) are hidden setup, as in Rust. Displayed line numbers count visible lines only.
- `error` strings are tsc's first line, e.g. `error TS2322: Type 'string' is not assignable to type 'number'.`, validated against `^error TS\d+: `.
- `thrown` strings are Node's `String(error)` for the uncaught value, e.g. `TypeError: Cannot read properties of undefined (reading 'toUpperCase')`.

`ts-pairs`, `ts-compiles`, `ts-build`, `ts-error`, `ts-fix` and `ts-type` have the Rust fields, screens, grading and wrong-answer lines unchanged (see the Rust spec §5). In the question-types list, `ts-compiles` is named "Type-checks?" ("Pick the snippet tsc accepts"), `ts-error` is "Spot the type error", and `ts-fix` means "Pick the change that type-checks".

### `ts-predict`
| Field | Meaning |
|---|---|
| `code: string[]` | The program |
| `opts: { text: string; kind: 'output' \| 'error' \| 'throws' }[]` (3–4) | `output` renders as program output. An `error` option's `text` is exactly `Type error` and a `throws` option's is exactly `Throws at runtime` (the validator enforces both, as Rust content writes `Doesn’t compile`). At most one `error` and one `throws` option |
| `answer: number` | Index into `opts` |
| `error?: string` | Required exactly when the answer's kind is `error` |
| `thrown?: string` | Required exactly when the answer's kind is `throws` |

A `throws` answer means the program throws, whatever it printed first.

### `ts-infer` ("Hover the type")
| Field | Meaning |
|---|---|
| `code: string[]` | The program |
| `line: number` | 1-based visible line |
| `name: string` | An identifier on `line` |
| `opts: string[]` (3–4) | Type texts, e.g. `string \| number`, `"a"`, `never` |
| `answer: number` | Index into `opts` |

- **Meaning:** the type the editor shows for `name` at that line, including narrowing (inside `if (typeof x === "string") {`, `x` is `string`).
- **Screen:** a code panel with `name` on `line` marked by a dotted underline plus a small "hover" tag (never color alone), then option tiles in monospace reading `name: <type>` with `aria-pressed`. The accessible name of the code region includes "`name` on line N". The prompt comes from content, e.g. "What type does the editor show for `x` on line 4?"
- **Grading and feedback:** `sel === answer`. A wrong answer shows `Answer: B`.
- **Validation:** `line` is a visible line, `name` appears on it as a whole word (`\bname\b`), options are unique and non-empty, `answer` is in range.
- **Authoring rule** (enforced by content validation, since `check:ts` asserts the type just after the line): `line` must not reassign `name`, apart from declaring it, and must not narrow it. The prompt names `` `name` `` and `line N`.

### Feedback
- `FeedbackText.compiler` holds the `error` for `ts-compiles`, `ts-error`, `ts-fix`, and `ts-predict` when the answer's kind is `error`, as for Rust. Its label comes from `LANG`: "rustc says" or "tsc says".
- `FeedbackText` gains `runtime?: string`: the `thrown` of a `ts-predict` whose answer's kind is `throws`, shown under the label "Node says" in the same monospace block style.
- `ts-infer` sets neither.

### Answer state
No new `AnswerState` fields: `ts-infer` uses `sel` (a number).

## 4. Display

### Course entry
- `content/courses.json` gains, third in picker order: `{ "id": "ts", "name": "TypeScript", "tagline": "TypeScript, one tap at a time", "blurb": "Types, objects, functions and narrowing, for developers new to JavaScript.", "icon": "ts" }`.
- `TsIcon` in `src/components/icons.tsx` is a simple "TS" monogram SVG in the style of the existing icons, with a case in `CourseIcon`'s exhaustive switch.

### Highlighting (`src/lib/highlightTs.ts`)
- Hand-written, line-based, no dependency, in the style of `highlightRust`. Multi-line constructs are not tracked.
- Kinds:
  - `keyword`: `const let var function return if else switch case default break for while of in type interface as typeof keyof readonly new true false`
  - `type`: `string number boolean null undefined unknown never any void object`, and CapitalizedIdents
  - `string`: `'…'`, `"…"` and single-line template literals (`${…}` isn't tokenized inside)
  - `number`, `comment` (`//` to end of line), `punct`, `plain`
- It reuses the existing token colors, so there are no new contrast checks.
- `CodePanel`'s `lang` becomes `'css' | 'rust' | 'ts'`. Both code languages hide `# ` lines and show the numbered gutter.

### Runtime throws
- `CodeDemo` and `code-choice` options gain `thrown?: string`.
  - `error` excludes `output` and `thrown`.
  - `output` and `thrown` may appear together: the program printed that, then threw.
  - Rust content never uses `thrown`, and the validator rejects it there.
- `OutputPanel` takes `lang`, `output?`, `error?` and `thrown?`.
  - The `error` title comes from `LANG`.
  - `thrown` renders the output (if any), then a block with the error icon, the title "Throws at runtime", and the message in monospace.
  - The Rust rendering is unchanged.

### Learn
`RustPlayground` becomes `CodePlayground`, which takes the lang from the course. `buildRustDemo`/`RustDemoView` become `buildCodeDemo`/`CodeDemoView` and carry `thrown`. The demo result keeps its existing live-region announcement.

## 5. `npm run check:ts`

### Shared lib
- `scripts/rust-check-lib.ts` becomes `scripts/code-check-lib.ts`.
- `collectSnippets(units, questions)` switches over both families with paired cases (exhaustive, with a `never` default as today).
- `judge(snippet, result)` covers every expectation.
- `Expect` gains `{ kind: 'throws'; output?: string[]; thrown: string }`, and `CompileResult` gains `thrown?: string` on success.
- `scripts/check-rust.ts` keeps its rustc adapter and its behavior.

### TS adapter (`scripts/check-ts.ts`)
**Pinned compiler.** `typescript` in `package.json` becomes an exact version, because inferred type texts and messages shift between releases. The checker calls `node_modules/.bin/tsc`.

**One compile per run.** Every snippet is written to a temp dir as `sN.mts` (program source with hidden lines un-hidden, plus `export {};` so files don't share scope), next to:
- `globals.d.ts`: `declare const console: { log(...args: unknown[]): void; error(...args: unknown[]): void };`
- `eq.d.ts`: `type __Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;`
- A `tsconfig.json` with `strict: true`, `target: es2023`, `lib: ["es2023"]`, `types: []`, `module: nodenext`, `noEmitOnError: false`, `pretty: false`, `outDir: out`.

**Diagnostics.** Lines are parsed as `sN.mts(line,col): error TS1234: message`. The first error per file gives its code and program line, mapped to a visible line with `visibleLineNumber`.

**Running.** Each snippet that type-checks runs as `node harness.mjs out/sN.mjs` with a 5 s timeout. The harness does `await import(pathToFileURL(file))` and, on a catch, writes `THROWN <String(e)>` to stderr and exits 3. Stdout is captured.

**Environment.** Node is the version in `.nvmrc`.

### Checks
| Source | Expectation |
|---|---|
| `ts-predict`, answer `output` | Type-checks, runs without throwing, stdout equals `text` |
| `ts-predict`, answer `error` | tsc fails with the code in `error` |
| `ts-predict`, answer `throws` | Type-checks and throws exactly `thrown` |
| `ts-compiles` | The `answer` snippet type-checks and runs without throwing; the other fails with the code in `error` |
| `ts-build` | Code with `answer` filled in type-checks; stdout equals `output` if given |
| `ts-error` | Fails with the code in `error`, on visible line `answer` |
| `ts-fix` | `code` fails with the code in `error`; the `answer` diff type-checks; every other option still fails |
| `ts-type` | Type-checks with each `accept` value filled in |
| `ts-infer` | One snippet per option, with `const __okN: __Eq<typeof NAME, OPT> = true;` inserted right after `line`. The answer type-checks; each distractor fails with exactly TS2322 on the inserted line |
| `code` / `code-choice` demos | `output` → type-checks, stdout matches. `error` → fails with that code. `thrown` → throws exactly that, after printing `output` if given |

- Any snippet that type-checks and isn't expected to throw must run without throwing, as in Rust's `runError` rule.
- Output is one line per failure with the question id (or `unit/card N/option`) and the reason. Exit code 1 on any failure.

### CI
A new `ts-content` job in `.github/workflows/ci.yml` runs checkout → `actions/setup-node` (`node-version-file: .nvmrc`, `cache: npm`) → `npm ci` → `npm run check:ts`.

## 6. Content (`content/ts/`)

- Four files, as for every course. Each unit has an 8-question quiz, one question per type, listed in type order in `topics.json`: 32 questions in total. Question ids use a `ts-` prefix (`ts-infer-3`).
- Legend: **C** = `code` demo, **CC** = `code-choice` demo.

**1 · Values & equality** (`values`): *Predict what basic values do.*
1. `let`, `const`, annotations and inference (C)
2. One `number` type: `0.1 + 0.2`, `NaN` (C)
3. Strings and template literals (C)
4. `===` vs `==`, and how tsc rejects comparing unrelated types (TS2367) (CC)
5. `null` vs `undefined` under strict null checks (CC)
6. Truthiness: `0`, `""`, `NaN`, `null`, `undefined` are falsy (CC)

**2 · Objects & arrays** (`objects`): *Model data with object types, and predict aliasing.*
1. Object literals and `type User = { … }` (C)
2. Structural typing, and excess-property checks on literals (CC)
3. Objects are references: `const b = a; b.x = 2` (C)
4. `const` doesn't freeze; `readonly` and `as const` (CC)
5. Arrays: `number[]`, `map`/`filter`; `words[5].toUpperCase()` type-checks but throws, because an out-of-range read gives `undefined` (C, `thrown`)
6. Spread and destructuring are shallow copies (CC)

**3 · Functions** (`functions`): *Write typed functions and predict closures.*
1. Parameter and return types; return-type inference (C)
2. Arrow functions (C)
3. Optional vs default parameters (`x?: number` is `number | undefined`) (CC)
4. Function types and callbacks (C)
5. Closures capture variables, not values (CC)

**4 · Unions & narrowing** (`narrowing`): *Model "one of these" and let the compiler prove which.*
1. Union types (C)
2. Narrowing with `typeof` and `in` (CC)
3. Literal types: `const` infers `"a"`, `let` infers `string` (CC)
4. Discriminated unions with `kind` and `switch` (C)
5. `?.`, and `??` vs `||` (the `0`/`""` trap) (CC)
6. Exhaustiveness via `never`: a missing case becomes a type error (CC)

**Totals:** 23 cards, 32 questions.

**Coverage rules**
- Every unit has a `ts-infer` question: inference (1), object types (2), return types (3), narrowed types (4).
- Unit 2 has at least one `throws` answer or demo: an `as` cast that lies about a value's shape, or the out-of-range read above.
- Each quiz's `ts-type` and `ts-build` answers are tokens the unit taught.

## 7. Verification

### Vitest
- **Refactor:** every existing Rust test passes. Test files move with their modules, and only imports and names change. `rust-check-lib.test.ts` becomes `code-check-lib.test.ts` with its cases intact.
- **Content:** TS validation, including the `ts-infer` line/name rule, at most one `error`/`throws` option, `error`/`thrown` present exactly when required, the TS error-string pattern, and `thrown` rejected in Rust content.
- **Grading and feedback:** `grade/code` and `feedback/code` for every `ts-*` type, including `runtime` and the "tsc says" label.
- **Components:** `highlightTs` tokens; `CodeInfer` (marked name, `aria-pressed`, tones after Check); `OutputPanel` thrown state (with and without prior output); `CodePanel` `lang="ts"` numbering and hidden lines.
- **Checker lib:** tsc diagnostic parsing, `THROWN` parsing, `__Eq` insertion placement, and `judge` for every expectation, including `throws`.

### Playwright
- TS smoke test: first launch → TypeScript → Values cards (switch a `code-choice` option and see the result change) → Practice this → one right answer, one wrong (heart lost, question re-queued) → results → Home shows XP.
- The CSS, Rust and migration tests keep passing.

## 8. Docs
- `CLAUDE.md`:
  - Add a "TypeScript course" rules section (strict tsc, `thrown` strings, `ts-infer` rule, `check:ts`).
  - Generalize "Adding a course": a new code course adds a highlighter, a `LANG` entry, key pairs in the code-family switches, and a checker adapter.
  - Update the "What exists" table.
- `docs/content-schema.md`: the TS course, `ts-predict` kinds, `ts-infer`, `thrown`, and the `code-choice` rename.
- `docs/design-rationale.md`: why `ts-infer` and `throws` exist for this audience.

## 9. Build order

Each step keeps all tests green, and CI green.

1. **Shared code engine.** Generic shapes, `codeLang.ts`, `lib/code.ts`, `renderers/code/`, `grade/code.ts`, `feedback/code.ts`, guards, the `code-choice` rename, and `code-check-lib.ts`. No visible change.
2. **TS display.** `highlightTs`, `CodePanel` lang, `thrown` in `OutputPanel`, demos and Learn, feedback `runtime` and the lang-specific labels, the `TsIcon` component (wired into `CourseIcon` in step 5).
3. **TS question types.** `TS_TYPE_KEYS`, shapes, validator, grader, feedback, and the `CodeInfer` renderer, tested against fixtures (no `'ts'` course id yet).
4. **Checker.** `check:ts`, the exact `typescript` pin, and the `ts-content` CI job (it passes on an empty `content/ts/` until step 5).
5. **Content.** One unit per step (values → objects → functions → narrowing), each passing `check:ts`. Then add `'ts'` to `COURSE_IDS`/`COURSE_ICON_NAMES`/`TYPE_KEYS`, the `CourseIcon` case, `courses.json`'s TS entry, the bundle in `src/content/index.ts`, and the TS e2e test.
6. **Docs.**
