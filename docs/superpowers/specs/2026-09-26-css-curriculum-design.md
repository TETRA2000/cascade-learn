# Job-ready CSS curriculum — design

Status: approved in brainstorming 2026-09-26, awaiting spec review
Scope: Learn + Practice content for the whole app, and the engine/app changes that content needs.
Paths: since the multi-course change (`2026-09-26-multi-course-rust-design.md`), CSS content lives in `content/css/`, and unit/question lookups take the course (`unitByKey(course, key)`).

## 1. Intent

**Stated by the user**
- A complete Learn tab and Practice tab for basic CSS3.
- Target learner: a newly graduated developer; the goal is being ready to work as a frontend developer.

**Assumptions (confirmed in brainstorming)**
- The learner knows basic HTML and some JavaScript, but their CSS is patchy.
- "Ready" means they can build and debug everyday production UI (responsive pages, components, forms) without copying snippets blindly. It is not a certification.
- The format stays the app's own: short cards with live playgrounds, then practice in the 7 existing question types.
- "CSS3" means modern, Baseline-widely-available CSS as of 2026 (so custom properties and `clamp()` are in).

**Decisions**
| Decision | Choice |
|---|---|
| Scope bar | Job-ready core: 15 units in 5 sections |
| Readiness signal | A per-unit quiz plus one checkpoint per section |
| Progression | Everything open; Home recommends the next unit and says when each checkpoint is best taken |
| Stylesheet demos | Sandboxed `<iframe srcdoc>` renderer (`CssSandbox`), shared by Learn and Practice |

**Success criteria**
- All 15 units, 88 cards and 105 questions ship, and every automated content check passes (§6).
- Every unit's outcome is tested by at least one production-type question (build, tune, bug or type).
- A learner can finish every unit and pass all 5 checkpoints.

**Out of scope:** container queries, `:has()`, nesting, cascade layers, logical properties, subgrid, Sass/Tailwind, mini-projects with a free-form editor, a final exam, streaks, spaced repetition, checkpoint-specific XP.

## 2. Curriculum map

Legend: **K** = knob demo, **C** = choice demo (both exist today), **S** = sheet demo (new, §4), **—** = no demo.
`(moved)` = an existing card relocated as-is; `(new)` = to be written.

Unit keys change: `props` is dissolved and new keys are added. Nothing is persisted yet, so there is no migration.

### Section: Foundations (`foundations`)

**1 · How CSS works** (`basics`) — *Read any rule and know where styles come from.*
1. A rule = selector + declarations — K
2. Selectors choose who gets styled — C
3. The cascade settles conflicts — C
4. (new) Where styles come from: external sheet, `<style>`, `style=""`, browser defaults — S

**2 · Selectors in depth** (`selectors`) — *Target exactly the elements you mean.*
1. (new) Descendant vs child: `nav a` vs `nav > a` — S
2. (new) Sibling combinators `+` and `~` — S
3. (new) Attribute selectors `[type="email"]`, `[href^="https"]` — S
4. (new) State pseudo-classes `:hover`, `:focus-visible`, `:active` (hint: "Hover or Tab to the button") — S
5. (new) Structural pseudo-classes `:first-child`, `:nth-child(odd | 3n)`, `:not()` — S
6. (new) Pseudo-elements `::before` / `::after` and `content` — S

**3 · Cascade & inheritance** (`cascade`) — *Predict which value wins and fix "my style doesn't apply" without `!important`.*
1. (new) Scoring compound selectors (`nav a.active` = 0·1·2) — C
2. (new) Ties go to the later rule, even across files — C
3. (new) Inline styles and `!important`, and why to avoid both — C
4. (new) Inheritance: `color` and `font` inherit, `border` and `padding` don't — S
5. (new) `inherit`, `initial`, `unset` — S
6. (new) `currentColor` — S

**4 · The box model** (`box`) — *Size any box and center it horizontally.*
1. Every element is a box — K
2. box-sizing: what does width mean? — K
3. Shorthand: one to four values — K
4. (moved from `props`) Borders and corners — K
5. (new) Centering a block with `margin: 0 auto` — K

**5 · Display & normal flow** (`flow`) — *Explain how elements sit on the page before any layout system.*
1. (new) Normal flow: blocks stack, width fills — K
2. (new) `display: block | inline | inline-block` (inline ignores width and vertical margin) — K
3. (new) Margin collapsing — K
4. (new) `overflow: visible | hidden | auto` — K
5. (new) Hiding things: `display:none` vs `visibility:hidden` vs `opacity:0` — C

### Section: Layout (`layout`)

**6 · Flexbox** (`flex`) — *Build nav bars, toolbars and media objects.*
1–5. The existing cards (Turn on flex … flex-grow) — K
6. (new) `flex-wrap` — K
7. (new) Pushing items: `margin-left: auto` and `align-self` — K

**7 · Grid** (`grid`) — *Build page layouts and responsive card grids.*
1–4. The existing cards (Define columns … Centering with grid) — K
5. (new) Placing by line: `grid-column: 1 / 3` — K
6. (new) Named areas with `grid-template-areas` — C
7. (new) The implicit grid and `grid-auto-rows` — K
8. (new) `repeat(auto-fit, minmax(120px, 1fr))` with viewport chips — S

**8 · Positioning & z-index** (`position`) — *Place overlays and badges, and debug stacking.*
1. (new) `position: relative` and offsets — K
2. (new) `absolute` measures from the nearest positioned ancestor — K
3. (new) `fixed` vs `sticky` (scrollable stage) — S
4. (new) `inset: 0` and centering overlays — K
5. (new) `z-index` only works on positioned (and flex/grid) items — K
6. (new) Stacking contexts: why `z-index: 9999` can still lose — S

### Section: Responsive (`responsive`)

**9 · Units & sizing** (`units`) — *Pick the right unit and bound sizes.*
1. (moved from `props`) Units: px, %, rem — K
2. (new) `em` compounds when nested — S
3. (new) Viewport units `vw`, `vh`, `dvh` — S
4. (new) `min-width` / `max-width` — K
5. (new) `min()`, `max()`, `clamp()` — S
6. (new) `aspect-ratio` and `object-fit` — K

**10 · Responsive design** (`responsive`) — *Write mobile-first CSS that adapts with and without breakpoints.*
1. (new) The viewport meta tag: why phones render at 980px without it — S
2. (new) Mobile-first `@media (min-width: …)` — S
3. (new) Pick breakpoints where the content breaks, not by device — S
4. (new) Fluid without media queries: wrap, auto-fit, clamp — S
5. (new) Responsive images: `max-width: 100%; height: auto` — S
6. (new) User preferences: `prefers-color-scheme` and `prefers-reduced-motion`. The demo reflects the learner's real OS setting, and the caption tells them what it is — S

### Section: Visual (`visual`)

**11 · Color & backgrounds** (`color`) — *Style surfaces that read well.*
1. (moved from `props`) Color and background (contrast) — K
2. (new) Hex, `rgb()` and `hsl()` with alpha — K
3. (new) Opacity fades children; alpha doesn't — K
4. (new) Gradients — K
5. (new) `background-size: cover` and `background-position` (images are inline SVG/gradients; no external assets) — K
6. (new) `box-shadow` — K

**12 · Typography** (`typography`) — *Set readable, robust text.*
1. (moved from `props`) Typography — K
2. (new) Font stacks and fallbacks — K
3. (new) Unitless `line-height` — K
4. (new) `letter-spacing` and `text-transform` — K
5. (new) Web fonts: `@font-face` and `font-display` — —
6. (new) Long text: `text-overflow: ellipsis` and `overflow-wrap` — K

**13 · Transitions & transforms** (`motion`) — *Add motion that is smooth and respects users.*
1. (new) Transform functions: translate, rotate, scale — K
2. (new) Transforms don't move neighbors — K
3. (new) Transitions on `:hover` / `:focus-visible` — S
4. (new) Duration and timing functions — S
5. (new) `@keyframes` animations — S
6. (new) Respecting `prefers-reduced-motion` — S

All motion in unit 13's demos is wrapped in `@media (prefers-reduced-motion: no-preference)`. That is the lesson, and it also keeps the app's own reduced-motion rule.

### Section: Craft (`craft`)

**14 · Custom properties & theming** (`vars`) — *Build a themeable component.*
1. (new) Declaring on `:root` and `var()` — S
2. (new) Fallbacks: `var(--accent, tomato)` — S
3. (new) Scope: override a variable inside one component — S
4. (new) Themes via an attribute (`[data-theme="dark"]`) — S
5. (new) Dark mode with `prefers-color-scheme` + variables — S

**15 · Debugging & a11y habits** (`debug`) — *Find silent failures and keep UI accessible.*
1. (new) CSS fails silently: invalid declarations are dropped — C
2. (new) The outline trick: `* { outline: 1px solid red }` — S
3. (new) Why did my rule lose? Reading specificity like DevTools does — C
4. (new) Focus styles: never `outline: none` without a replacement — S
5. (new) Hide visually but not from screen readers (`.sr-only` vs `display:none`) — C
6. (new) Keep specificity flat: a small reset + one-class selectors (BEM naming) — C

**Totals:** 88 cards, of which 69 are new.

## 3. Practice design

### Unit quizzes ("Practice this")
- 6 questions per unit, listed in `topics.json`, for 90 in total.
- Each quiz goes from recognition to recall (the question-types order), uses at least 3 types, and ends with a production type where the topic allows.
- The rules are unchanged: 5 hearts, a miss is re-queued at the end, +10 XP on the first try, +5 on a retry.

Existing questions are remapped; new ones fill each unit up to 6:

| Unit | Existing questions | New |
|---|---|---|
| basics | bug-1, bug-2 | 4 |
| selectors | — | 6 |
| cascade | versus-1, versus-2, versus-3 | 3 |
| box | pairs-2, tune-2, tune-3, build-3 | 2 |
| flow | — | 6 |
| flex | predict-1, predict-2, build-2, tune-1 | 2 |
| grid | predict-3, predict-4, build-1 | 3 |
| position | — | 6 |
| units | bug-3 | 5 |
| responsive | — | 6 |
| color | — | 6 |
| typography | pairs-3, type-1, type-2, type-3 | 2 |
| motion | pairs-1 | 5 |
| vars | — | 6 |
| debug | — | 6 |
| **Total** | 22 | 68 |

### Section checkpoints
- 5 checkpoints, one per section. Each run has 10 questions and **3 hearts**.
- Composition:
  - 7 are drawn at random from the section's unit quizzes, stratified so every unit contributes at least one.
  - 3 are fixed **integration questions** that combine units, e.g. "the badge is `position:absolute` in a flex card — why is it pinned to the page corner?". They are listed in `sections.json` and never appear in unit quizzes, mixed review or by-type runs.
- The queue is sorted into the question-types order (recognition → recall). Missed questions are re-queued as usual.
- **Pass** = the queue is exhausted with at least 1 heart left, which is recorded in `completedSets` as `checkpoint:<section>`. **Fail** = the existing "Out of hearts" screen.
- Checkpoints are always available. Each row shows "Best after: <unit names> (n/m done)".
- The 5 checkpoints need 15 integration questions, bringing the total to **105 questions**.

### Changed runs (update CLAUDE.md when implemented)
A unit is **completed** once the learner leaves its last card with Done or Practice this (`completedUnits`, as today).

- **Mixed review:** 7 questions, one random question per type, drawn from the quizzes of *completed* units. If no completed unit has a question of that type, it is drawn from all unit quizzes. With no completed units, all unit quizzes are the pool.
- **Practice by type:** up to 8 random questions of the type, taking completed units' questions first and filling from the rest.

## 4. Engine & app changes

### `CssSandbox` (new component)
- Renders `<iframe sandbox="" srcdoc="…" title="Live preview">`. The empty sandbox list means no scripts, no forms, no same-origin access.
- The srcdoc is `<!doctype html>`, then a viewport meta, then the Google Fonts link, then a base `<style>` (body margin 0, app fonts, ink color), then `<style>{css}</style>`, then `{html}`. Building the srcdoc is a pure function, `buildSrcdoc(html, css)`.
- **Viewport width:** the iframe's CSS width is the selected viewport in px, so `@media` evaluates against that width. When it is wider than the stage, the iframe gets `transform: scale(stage / viewport)` with `transform-origin: top left`, and the stage keeps the scaled height.
- `:hover`, `:focus-visible` and scrolling work natively inside it. Keyboard users can Tab into the frame.
- Reduced motion: the iframe evaluates `prefers-reduced-motion` from the device. When the parent's `matchMedia` reports `reduce` and a card belongs to unit `motion`, the card shows "Reduced motion is on — animations are paused."
- **Input safety:** only content-authored HTML and CSS enter the srcdoc. The one user-derived value, in type questions, is still restricted to `sanitizeCssKeyword()` output. The validator rejects `<script`, `on…=` attributes, `javascript:` and `<iframe` anywhere in content HTML.
- Used by sheet demos, predict questions with `html`, and bug questions with `sheet`.

### Schema additions (all optional; existing content stays valid)

```ts
// lessons.json — a third demo kind
interface SheetDemo {
  kind: 'sheet';
  html: string;              // may contain {{n}} knob slots
  css: string[];             // stylesheet lines; may contain {{n}} slots
  showHtml?: boolean;        // also list html lines (as § lines) in the code panel
  knobs?: { label: string; opts: string[]; start?: number }[];
  viewports?: number[];      // px widths offered as chips, e.g. [360, 600, 960]
  viewportStart?: number;    // index into viewports (default 0)
  height?: number;           // stage height in px (default 180)
  hint?: string;             // e.g. "Hover the button" / "Press Tab"
}

// questions.json — predict can render options as stylesheets
interface PredictQuestion {
  /* existing fields */
  html?: string;                                        // when set, options render in CssSandbox
  opts: { s?: string; css?: string; d: string; kids?: string[] }[];
}

// questions.json — bug can run the shown code for real
interface BugQuestion {
  /* existing fields; expected/actual become optional when sheet is set */
  sheet?: { html: string; fix: string };
  // "Actual" renders `code` exactly as shown (the bug really runs).
  // "Expected" renders `code` with line `answer` replaced by `fix`.
}

// content/sections.json (new)
interface Section {
  key: string;               // foundations | layout | responsive | visual | craft
  name: string;
  units: string[];           // unit keys, in order
  checkpoint: string[];      // 3 integration question ids
}

// LessonKey gains `checkpoint:${string}`
```

- **Sheet demo view:** a pure function `buildSheetDemo(demo, selection, viewportIndex)` → `{ html, css, code[], controls[], viewport }`. Slots are filled in both `html` and `css`. The code panel shows exactly the CSS that runs (plus the HTML if `showHtml` is set). `highlightLine` gains at-rule support (`@media … {` is colored as a selector-like line).
- **Unchanged types:** versus stays color-keyword only; cascade questions that aren't about color use predict with `html`. Pairs, build, tune and type are unchanged.
- **Rules:** `HEARTS_PER_CHECKPOINT = 3` joins `HEARTS_PER_LESSON` in `src/state/rules.ts`.

### Home
- **Learn tab:** unit rows grouped under the 5 section headings, each heading with "n/m done". After each section's units comes a checkpoint row that starts `checkpoint:<section>`, with the "Best after" guidance and a ✓ once passed. The hero card is the first incomplete unit in curriculum order ("Review" once all are done).
- **Practice tab:** the Mixed review hero, then a **Checkpoints** list (same rows), then Practice by type.

## 5. Build order (sub-projects)

Each sub-project gets its own implementation plan; this spec is the shared reference.

1. **Quiz engine** — build steps 4–7 from CLAUDE.md (engine, 7 renderers, feedback sheet, persistence) plus the Playwright smoke test. Everything in Practice depends on it.
2. **Curriculum engine** — `CssSandbox`, sheet demos, predict/bug sheet extensions, `sections.json`, checkpoint/mixed/by-type queue builders, grouped Home, validator additions, and the Playwright content sweep.
3. **Content**, in five batches: Foundations (including renaming `props` and moving its cards), Layout, Responsive, Visual, Craft. Each batch: write → validator + sweep green → human review checklist → commit.

## 6. Content quality & testing

**Writing rules** — to be recorded in `docs/content-guide.md`. Validator-enforced where marked ✓:
- One concept per card. Body ≤ 50 words ✓; tip ≤ 30 words ✓.
- Every distractor is a real misconception; every explanation says *why*.
- Plain English suitable for readers whose first language isn't English.
- Only Baseline widely-available features.
- No external assets: images are inline SVG data URIs or gradients.

**Validator additions** (Vitest, run on every test pass):
- Every `{{n}}` slot has a knob n, and every knob is used.
- Viewports are positive and ascending.
- Content HTML contains no scripts, event handlers, `javascript:` or iframes.
- `sections.json` covers every unit exactly once, in lessons.json order.
- Every unit's quiz has exactly 6 questions covering at least 3 types.
- Checkpoint ids exist, there are exactly 3 per section, and none appears in any unit quiz.
- Predict answer key: every declaration in `code` appears in the rendered CSS of the answer option (stage + option + kids, or option `css`). No distractor's rendered CSS contains all of them.
- Bug `sheet.fix` differs from the answer line.

**Browser checks (Playwright):**
- Smoke test: one lesson and one quiz (sub-project 1).
- Content sweep: open every card and every question. Assert no console errors and no zero-height sandboxes, and assert that every declaration shown in a code panel passes `CSS.supports(prop, value)`, except the answer line of bug questions.
- axe-core checks on Home, a Learn card with a sandbox, and a quiz screen.

**Unit / component tests:** `buildSrcdoc`, `buildSheetDemo`, `highlightLine` at-rules, validator rules, and the checkpoint / mixed / by-type queue builders (with injected randomness). RTL tests for the grouped Home and the checkpoint rows.

**Human review:** each content batch lands as its own commit with a checklist (accuracy, one outcome per unit, distractor quality, explanation says why), signed off by the user or a frontend reviewer before the next batch.
