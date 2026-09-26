# Multi-course Cascade + Rust question engine — design

Status: approved in brainstorming 2026-09-26, awaiting spec review
Scope: rename the app to "Cascade", turn it into a multi-course app, add the Rust question engine with a one-unit starter, and add GitHub Actions CI for the whole project.
Follow-up: the full everyday-Rust curriculum (12–15 units) is a separate spec written against this platform.

## 1. Intent

**Stated by the user**
- Rename the repo to "cascade".
- Support multiple learning courses instead of CSS only; Rust is the first new course.
- Add GitHub Actions CI, covering the existing CSS app as well.

**Decisions (confirmed in brainstorming)**
| Decision | Choice |
|---|---|
| Rust audience | Developers who know another language (JS/TS, Python…) and want to read and write everyday Rust |
| Grading | Authored answers only, as in CSS. No code runs in the app. Snippets are checked against real `rustc` in CI (§8) |
| First Rust release | Full curriculum is spec 2. This spec ships the platform plus a one-unit starter |
| Course navigation | One active course (Duolingo-style), switched from a header chip that opens a course picker |
| XP | One global total (derived), with a per-course breakdown in the picker |
| Architecture | Course folders + course-scoped question-type keys dispatched by exhaustive switches. Existing CSS renderers are untouched |
| Rust question types | `rs-predict`, `rs-pairs`, `rs-compiles`, `rs-build`, `rs-error`, `rs-fix`, `rs-type` |

**Assumptions**
- CSS remains a course with its current content and behavior. The approved CSS curriculum spec (`2026-09-26-css-curriculum-design.md`) still applies, with content paths moved under `content/css/`.
- Hearts, XP rules, re-queueing, the feedback sheet and mixed review behave the same in every course.

**Success criteria**
- A new learner sees the course picker, picks Rust, finishes the starter unit and its "Practice this" quiz, and can switch to CSS and back from Home.
- An existing learner with `cascade.progress.v1` lands in CSS with their XP and completions intact and never sees the picker.
- Every Rust snippet with an authored output or error passes `npm run check:rust`.
- CI (`check`, `e2e`, `rust-content`) is green on the branch before merge. All existing CSS tests still pass.

**Out of scope:** running arbitrary Rust, accounts and sync, streaks, a lesson map, lazy-loading course content, a third course, renaming the local working folder, the full Rust curriculum.

## 2. Rename

- GitHub: `gh repo rename cascade` (`TETRA2000/cascade-css` → `TETRA2000/cascade`), then `git remote set-url origin git@github.com:TETRA2000/cascade.git`. GitHub redirects the old URL. **This is outward-facing: confirm with the user immediately before running it.**
- `package.json` `name`: `cascade`. `index.html` `<title>`: `Cascade`.
- Home wordmark stays "Cascade". The tagline under it comes from the active course (`courses.json` `tagline`).
- README and CLAUDE.md describe a multi-course app. CSS-only rules (sanitizing typed CSS, `§` HTML lines, real-CSS previews) move under a "CSS course" heading. Rust rules (hidden `# ` lines, authored outputs checked by `check:rust`) get their own heading.
- The local folder `~/repo/cascade-css` is not renamed. That is the user's call.

## 3. Content layout and types

### Files
```
content/
  courses.json              # [{ id, name, tagline, blurb, icon }] in picker order
  css/                      # today's four files, moved unchanged
    lessons.json  questions.json  question-types.json  topics.json
  rust/
    lessons.json  questions.json  question-types.json  topics.json
```
`courses.json` example entry: `{ "id": "rust", "name": "Rust", "tagline": "Rust, one tap at a time", "blurb": "Ownership, borrowing, enums and errors for developers who already code.", "icon": "rust" }`.
`icon` names an SVG exported from `src/components/icons.tsx` (`CssIcon`, `RustIcon`). No emoji.

### Types (`src/content/types.ts`)
- `CourseId = 'css' | 'rust'`.
- `CssTypeKey` = today's 7 keys. `RustTypeKey = 'rs-predict' | 'rs-pairs' | 'rs-compiles' | 'rs-build' | 'rs-error' | 'rs-fix' | 'rs-type'`. `QuestionTypeKey = CssTypeKey | RustTypeKey`.
- `CssQuestion` = today's `Question` union, unchanged. `RustQuestion` = the 7 shapes in §5. `Question = CssQuestion | RustQuestion`.
- `Demo` = today's `KnobDemo | ChoiceDemo` plus `CodeDemo | RustChoiceDemo` (§6).
- `Course = { id; name; tagline; blurb; icon; units; questions; questionTypes; topics }`.
- `LessonKey` keeps its current shape (`'mixed' | 'topic:<unit>' | <type key>`) and is always interpreted within one course.

### Loading (`src/content/index.ts`)
- Static JSON imports (both courses are small). Exports `courses: readonly Course[]` and `courseById(id): Course`.
- `unitByKey`, `questionById`, `questionsOfType`, `lessonName` and `lessonQuestionIds` take `course: Course` as their first argument. Components receive the course from app state and never import JSON.
- Unit keys and question ids must be unique within a course. Rust question ids still use an `rs-` prefix (`rs-predict-1`) for readability.

### Validation (`src/content/validate.ts`)
- `validateContent(course)` runs per course. Each course's `question-types.json` must list exactly its own family of type keys, in the order declared in code (`CSS_TYPE_KEYS`, `RUST_TYPE_KEYS`).
- CSS cards may only use knob or `choice` demos. Rust cards may only use `code` or `rs-choice` demos.
- `courses.json` ids must match the set of course folders imported in `index.ts`.
- Rust questions: `answer` indexes are in range, `rs-type` code contains exactly one `___`, `rs-build` slot count equals `answer.length`, every `answer` word exists in `bank`, `rs-pairs` has 4 items and `order` is a permutation of their ids, `rs-error.answer` is a visible line number, and `rs-predict.error` is present exactly when the answer option's `kind` is `error`.

### Dispatch
- Renderers move to `src/quiz/renderers/css/` (file move only). New ones go in `src/quiz/renderers/rust/`.
- `QuestionBody` switches CSS keys to the existing renderers and `rs-*` keys to `RustQuestionBody`.
- `grade.ts` splits into `grade/css.ts` and `grade/rust.ts` behind the same `freshAnswer`, `canCheck` and `isCorrect` entry points. `feedback.ts` gets the same split.
- The switches are exhaustive, so a type key without a renderer, grader or feedback case fails `tsc`.
- Type-specific checks elsewhere use helpers: `isPairs(q)` (`pairs | rs-pairs`) and `isBuild(q)` (`build | rs-build`). These cover `session.ts` (`placeChip`, `pickPair`) and `Quiz.tsx` (no Check button for pairs).

### Session
`Session` gains `courseId: CourseId`. `startSession(course, lessonKey, ids)` records it, and `sessionReducer` resolves questions with `questionById(courseById(s.courseId), id)`. `Quiz` takes a `course` prop.

## 4. App state, course switching and progress

### State (`src/state/app.ts`)
- `AppState` gains `course: CourseId | null`. `null` means no course has been picked.
- `Screen` gains `{ name: 'courses' }`.
- New actions: `openCourses` shows the picker. `selectCourse(id)` sets `course`, `screen: home`, `tab: 'learn'`.
- Initial screen: `courses` when `course === null`, otherwise `home`.
- `completedUnits`, `completedSets` and `xp` move under `courses[id]`. Existing actions (`finishUnit`, `completeQuiz`…) write to the active course's entry.

### Course picker screen (`src/screens/Courses.tsx`)
- One full-width `<button>` per course: icon, name, blurb, "3 / 15 units", "120 XP".
- The active course shows a check icon plus the visible text "Current" (not color alone). The button has `aria-current="true"`.
- A Back button appears only when a course is already active.
- Heading "Choose a course". It follows the 390 px phone layout and 44 px touch targets.

### Home header
- A course chip `<button>` with the course icon and name, accessible name "Rust, change course", dispatches `openCourses`.
- The tagline under the wordmark comes from the active course.
- XP shows the global total (sum over courses). Hearts are unchanged.
- The Learn and Practice tabs list the active course's units and question types.

### Progress v2 (`src/storage/progress.ts`)
```ts
interface CourseProgress {
  completedUnits: Record<string, true>;
  completedSets: Partial<Record<LessonKey, true>>;
  xp: number;
}
interface Progress {
  activeCourse: CourseId | null;
  courses: Partial<Record<CourseId, CourseProgress>>;
}
```
- Key `cascade.progress.v2`. `ProgressStore` (`load`/`save`) is unchanged.
- `totalXp(progress)` is derived, never stored.
- Parsing stays defensive and never throws. Unknown course ids and non-`true` flags are dropped, and invalid `xp` becomes 0.
- **Migration:** if the v2 key is missing and `cascade.progress.v1` parses to non-empty progress, the result is `{ activeCourse: 'css', courses: { css: { completedUnits, completedSets, xp: totalXp } } }`. The v1 key is left in place and never written again.

## 5. Rust question types

Code arrays hold plain Rust lines. A line starting with `# ` (or equal to `#`) is a **hidden setup line**, following rustdoc's convention: it is compiled by `check:rust` but not displayed. Displayed line numbers count visible lines only.

| Type | Fields (plus `id`, `type`, `prompt`, `explain`) | Screen | Correct when | Wrong-answer line |
|---|---|---|---|---|
| `rs-predict` | `code: string[]`, `opts: { text: string; kind: 'output' \| 'error' }[]` (3–4), `answer: number`, `error?: string` | Code panel, then option tiles. `output` options render as monospace blocks. The `error` option reads "Doesn't compile" | `sel === answer` | `Answer: B` |
| `rs-pairs` | `items: { id; left: string; right: string }[]` (4), `order: string[]` | Left column: code tokens (highlighted). Right column: meanings. Same rules as CSS pairs: no hearts, 700 ms flash, auto-completes | all matched | mismatch count (as CSS) |
| `rs-compiles` | `a: string[]`, `b: string[]`, `answer: 'a' \| 'b'`, `error: string` | Two stacked code panels as selectable tiles labelled "A" and "B" (`aria-pressed`) | `sel === answer` | `Answer: A` |
| `rs-build` | `code: (string \| { slot: number })[]`, `bank: string[]`, `answer: string[]`, `output?: string[]` | Code with slots plus a word bank, as CSS build. After Check, the `output` panel appears | each slot's bank word equals `answer[i]` | `Answer:` + the filled slot lines |
| `rs-error` | `code: string[]`, `answer: number` (1-based visible line), `error: string` | Numbered, tappable code lines (shared `LinePicker`) | `sel === answer` | title "Not that one — it's line N" |
| `rs-fix` | `code: string[]`, `error: string`, `opts: { diff: string[] }[]` (3–4), `answer: number` | rustc error panel up front, then diff tiles. Diff lines start with `+ ` / `- `, shown as visible `+`/`−` glyphs with color on top | `sel === answer` | `Answer: C` |
| `rs-type` | `code: string[]` (exactly one `___`), `accept: string[]` | Code with the blank highlighted, text input below (`maxLength` 40, `autocapitalize="off"`, `spellcheck=false`) | input trimmed, internal whitespace collapsed to one space, exact case-sensitive match against `accept` | `Answer: <accept[0]>` |

**AnswerState reuse.** `sel` (number or `'a'`/`'b'`), `slots` (initialized for `rs-build`), `val`, and `left`/`right`/`matched`/`miss`/`misses` for `rs-pairs`. No new fields.

**Feedback sheet.** `FeedbackText` gains `compiler: string | null`, rendered as a monospace block under the explanation with the label "rustc says". It holds `error` for `rs-compiles`, `rs-error`, `rs-fix`, and `rs-predict` when the answer is the error option. Otherwise it is `null`. CSS types always return `null`.

**Shared components.** `LinePicker` is extracted from CSS `Bug` (CSS `Bug` then uses it, with no behavior change). Word-bank chip and slot UI is shared by `Build` and `rs-build`.

**Safety.** Typed input only ever renders as React text. The CSS keyword sanitizer stays on the CSS `type` path only.

**Mixed review** stays one random question per type, in the active course's `question-types.json` order.

## 6. Rust Learn cards, highlighting and output

### Demo kinds
- `CodeDemo = { kind: 'code'; code: string[]; output?: string[]; error?: string }`: code panel, then an Output panel or error panel. At most one of `output` and `error`.
- `RustChoiceDemo = { kind: 'rs-choice'; label: string; start?: number; opts: { label: string; code: string[]; output?: string[]; error?: string; note?: string }[] }`: option chips (`aria-pressed`) swap the code panel and its result. Each option has exactly one of `output` or `error`.
- `initialSelection` and the Learn screen handle both kinds. The prototype's knob and choice logic is untouched.

### Highlighting (`src/lib/highlightRust.ts`)
- Hand-written, line-based tokenizer with no dependency. Kinds: `keyword`, `type` (primitives and CapitalizedIdents), `string` (incl. chars), `number`, `comment` (`//` to end of line), `lifetime`, `macro` (`ident!`), `punct`, `plain`. Multi-line constructs are not tracked.
- `stripHidden(code)` drops hidden `# ` lines. Display always uses it.
- `CodePanel` gains `lang: 'css' | 'rust'` (default `'css'`). Rust panels show line numbers in a non-selectable gutter.
- New token colors in `tokens.css`, each ≥ 4.5:1 against the code panel background.

### `OutputPanel` (`src/components/OutputPanel.tsx`)
- `output` renders as a monospace block with the label "Output".
- `error` shows the error icon, the title "Doesn't compile", then the rustc message in monospace.

## 7. Starter Rust content

- One unit, `ownership` ("Ownership & moves"), 4–5 cards using at least one `code` and one `rs-choice` demo. Topics: each value has one owner, moves on assignment, `clone()`, borrowing with `&`, `&mut` exclusivity.
- 7 questions, one per Rust type, all on ownership and borrowing. `topics.json`: `{ "ownership": [all 7 ids] }`.
- Every snippet passes `check:rust`.

## 8. Verification

### `npm run check:rust` (`scripts/check-rust.ts`, run directly by Node 24's built-in type stripping)
- Reads `content/rust/*.json`, builds full programs (hidden lines included), writes each to a temp dir, and runs `rustc --edition 2024 --error-format=json` with the pinned toolchain. Anything that compiles is then run.
- Checks:
  - `rs-predict`: if the answer option is `output`, the program compiles and stdout equals its text. If it is `error`, compilation fails.
  - `rs-compiles`: the `answer` snippet compiles, and the other fails.
  - `rs-build`: the code with `answer` filled in compiles, and stdout equals `output` if given.
  - `rs-error`: compilation fails, and the first error's primary span, mapped to visible lines, equals `answer`.
  - `rs-fix`: `code` fails. Applying the `answer` diff compiles. Every other option still fails.
  - `rs-type`: the code compiles with each `accept` value filled in.
  - `code` / `rs-choice` demos: `output` → compiles with matching stdout; `error` → fails.
  - Authored `error` strings must contain the error code rustc reports (e.g. `E0382`).
- Diff application for `rs-fix`: `- ` lines must match visible lines of `code` exactly and in order. They are replaced by the following `+ ` lines, and unprefixed lines are context.
- Output: one line per failing snippet with question id and reason. Exit code 1 on any failure.
- `rust-toolchain.toml`: `channel = "1.93.0"`, `profile = "minimal"`.

### Vitest
- Per-course content validation.
- Progress v2 parse and v1 migration, including malformed and foreign data.
- Reducer: `openCourses`, `selectCourse`, per-course writes.
- `grade/rust` and `feedback` for each Rust type.
- `highlightRust` tokens, and `stripHidden` with renumbering.
- One test file per Rust renderer, `Courses` screen, `OutputPanel`, and the feedback `compiler` block.
- Existing CSS tests pass unchanged apart from import paths and the course argument.

### Playwright
- The existing CSS smoke test adds "Choose a course → CSS". The double-tap test is updated the same way.
- New Rust smoke test: first launch → Rust → Ownership cards (switch an `rs-choice` option and see the output change) → Practice this → one right, one wrong (heart lost, re-queued) → results → Home shows XP.
- Migration test: seed `cascade.progress.v1` with XP, load, expect Home in CSS with that XP and no picker.

## 9. GitHub Actions CI

`.github/workflows/ci.yml`. Triggers: `push` to `main` and `pull_request`. `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`. Three parallel jobs on `ubuntu-latest`:

| Job | Steps |
|---|---|
| `check` | checkout → `actions/setup-node` (`node-version-file: .nvmrc`, `cache: npm`) → `npm ci` → `npm run typecheck` → `npm test` → `npm run build` |
| `e2e` | checkout → setup-node → `npm ci` → `npx playwright install --with-deps chromium` → `npm run test:e2e` → on failure, `actions/upload-artifact` of `playwright-report/` |
| `rust-content` | checkout → setup-node → `actions-rust-lang/setup-rust-toolchain` (reads `rust-toolchain.toml`) → `npm ci` → `npm run check:rust` |

Supporting changes:
- `.nvmrc` = `24`.
- `playwright.config.ts`: `reuseExistingServer: !process.env.CI`, `retries: process.env.CI ? 2 : 0`, `reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list'`.

## 10. Build order

Each step keeps `main`-quality: all tests green, and CI green from step 1 on.

1. **CI for the current app.** `.nvmrc`, Playwright config changes, `ci.yml` with the `check` and `e2e` jobs.
2. **Rename in code.** `package.json`, title, README/CLAUDE.md wording. The GitHub repo rename happens here, after user confirmation.
3. **Course-aware content.** `content/css/`, `courses.json` (CSS only for now), `Course` type, course-first content API, per-course validation, renderer/grade/feedback folder split, `Session.courseId`. No visible change.
4. **Course state and picker.** Progress v2 + migration, `AppState.course`, `Courses` screen, header chip, per-course tagline. Updated e2e + migration e2e.
5. **Rust display foundations.** `highlightRust`, `stripHidden`, `CodePanel lang`, `OutputPanel`, `CodeDemo`/`RustChoiceDemo` in Learn, feedback `compiler` block, `LinePicker` extraction.
6. **Rust question types.** Types, validation, graders, feedback copy, 7 renderers with tests.
7. **Rust starter content + content CI.** `content/rust/`, `courses.json` gains Rust, `scripts/check-rust.ts`, `rust-toolchain.toml`, `rust-content` CI job, Rust e2e.
8. **Docs.** `docs/content-schema.md` (course level, Rust shapes, hidden lines), `docs/design-rationale.md` (why each Rust type), a path note in the CSS curriculum spec, final CLAUDE.md pass.
