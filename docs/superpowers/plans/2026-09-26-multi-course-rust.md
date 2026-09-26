# Multi-course Cascade + Rust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the app to Cascade, make it multi-course (CSS + Rust) with a course picker and per-course progress, add the 7 Rust question types with a verified one-unit starter course, and run everything in GitHub Actions CI.

**Architecture:** Content moves into per-course folders behind a course-first content API (`courseById(id)`, `unitByKey(course, key)`, …). Question types are course-scoped keys (`predict` for CSS, `rs-predict` for Rust), dispatched by exhaustive switches split into `css` and `rust` modules for rendering, grading and feedback. The quiz engine (hearts, XP, re-queueing) stays type-agnostic and records `courseId` on the session. Progress is stored per course under `cascade.progress.v2`, with a one-way migration from v1. Rust answers are authored data; `npm run check:rust` compiles every snippet with a pinned rustc in CI.

**Tech Stack:** Vite 8, React 19, TypeScript 7, CSS Modules with token custom properties, Vitest 5 + React Testing Library + user-event, Playwright (Chromium), Node 24 (runs `.ts` scripts directly via type stripping), rustc 1.93.0 (content checks only), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-26-multi-course-rust-design.md`. Read it before starting. §-numbers below refer to it.

## Global Constraints

- Course ids: `css`, `rust`. Rust question-type keys, in difficulty order: `rs-predict`, `rs-pairs`, `rs-compiles`, `rs-build`, `rs-error`, `rs-fix`, `rs-type`.
- CSS behavior must not change: every existing CSS unit test and e2e test keeps passing (import paths, the course argument and the added "pick CSS" step are the only allowed test edits).
- Game rules are shared by all courses: 5 hearts, +10 XP first try, +5 after a miss, wrong answers re-queue, pairs never cost hearts and flash a mismatch for 700 ms, mixed review = one random question per type in the course's `question-types.json` order.
- Storage key `cascade.progress.v2`. `cascade.progress.v1` is read once for migration and never written or deleted.
- XP shown in the header is the global total, derived from per-course XP and never stored.
- Rust code arrays: a line starting with `# ` (or exactly `#`) is hidden (rustdoc convention): compiled by `check:rust`, never displayed. Displayed line numbers count visible lines only.
- Authored Rust errors look like `error[E0382]: borrow of moved value: \`s\`` (regex `^error\[E\d{4}\]: \S`).
- Typed input only ever renders as React text. Keep `sanitizeCssKeyword()` on the CSS `type` path only. Rust typed input: trimmed, inner whitespace collapsed to one space, case-sensitive, max 40 characters.
- Accessibility:
  - real `<button>` elements;
  - `aria-pressed` on selectable tiles and chips;
  - `aria-current` on the active course;
  - `aria-live` on feedback and demo captions;
  - touch targets ≥ 44px;
  - text contrast ≥ 4.5:1;
  - correct/incorrect and compile errors never signaled by color alone (icon + text, including accessible names).
- Respect `prefers-reduced-motion`. The feedback slide-up stays the only animation.
- Content lives in `content/**.json`, never in components. UI copy (button labels, hints) may live in components.
- No new runtime dependencies. New dev dependency: `@types/node@^24` only.
- Commit messages: sentence-case imperative subject (like `Add Tune to target question renderer`), ending with these two trailer lines:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM
  ```
- Work on branch `multi-course`. Never push, open a PR, or rename the GitHub repo without asking the user first.

## Review Focus

1. **Stored progress names a course this build doesn't ship** (e.g. `activeCourse: "go"` from a future build or a hand-edited value). The app must open the picker, not crash. Pinned in Task 6 (`stateFromProgress` test).
2. **Both v1 and v2 progress are present.** v2 wins; v1 is ignored, so XP is never counted twice. Pinned in Task 5 (`prefers v2 over v1`).
3. **A course-scoped practice key collides across courses** (`mixed`, or finishing a `topic:` run in Rust). It must only mark that course's set complete and bank XP to that course. Pinned in Task 6 (`keeps courses separate`).
4. **Hidden `# ` lines before the line rustc rejects.** Grading, the line picker and `check:rust` must all use visible line numbers. Pinned in Task 7 (`visibleLineNumber`) and Task 10 (`judge` with hidden lines).
5. **Messy typed Rust tokens**: `"  &mut  "` is accepted, `"&MUT"` is rejected, pasted input longer than 40 characters is capped. Pinned in Task 9 (grading) and Task 13 (reducer cap + renderer `maxLength`).

---

## File Structure

**Create**

| Path | Responsibility |
|---|---|
| `.github/workflows/ci.yml` | CI: `check`, `e2e`, `rust-content` jobs |
| `.nvmrc` | Node major for CI (`24`) |
| `rust-toolchain.toml` | Pinned rustc for `check:rust` |
| `content/courses.json` | Course list in picker order |
| `content/css/*.json` | Today's four content files, moved unchanged |
| `content/rust/*.json` | Rust starter course (1 unit, 5 cards, 7 questions) |
| `src/content/typeKeys.ts` | `COURSE_IDS`, type-key lists per course, `isCourseId` |
| `src/content/guards.ts` | `isRustDemo`, `isRustQuestion`, `isPairs`, `isBuild` |
| `src/content/validateUtil.ts` | Shared validation helpers (`isStr`, `Err`, …) |
| `src/content/validateCss.ts` | CSS demo + question validation (moved out of `validate.ts`) |
| `src/content/validateRust.ts` | Rust demo + question validation |
| `src/lib/rustCode.ts` | Hidden lines, blanks, slots, diffs, token normalizing (no imports; also used by the checker) |
| `src/lib/highlightRust.ts` | Rust line tokenizer |
| `src/components/OutputPanel.tsx` + css | Program output or compile error |
| `src/screens/Courses.tsx` + css | Course picker |
| `src/quiz/grade/{index,css,rust}.ts` | Answer rules, split by course family |
| `src/quiz/feedback/{index,shared,css,rust}.ts` | Feedback copy, split by course family |
| `src/quiz/renderers/css/*` | The 7 CSS renderers (moved) + `CssQuestionBody` |
| `src/quiz/renderers/rust/*` | 7 Rust renderers + `RustQuestionBody` |
| `src/quiz/renderers/{LinePicker,WordBank,PairBoard}.tsx` + css | Shared question UI extracted from Bug, Build, Pairs |
| `src/quiz/rustFixtures.ts` | Rust question fixtures for pure unit tests |
| `scripts/rust-check-lib.ts` (+ test), `scripts/check-rust.ts`, `scripts/tsconfig.json` | `npm run check:rust` |
| `e2e/migration.spec.ts`, `e2e/rust.spec.ts` | Browser tests |

**Modify:** `package.json`, `package-lock.json`, `index.html`, `playwright.config.ts`, `vite.config.ts`, `README.md`, `CLAUDE.md`, `docs/content-schema.md`, `docs/design-rationale.md`, `docs/superpowers/specs/2026-09-26-css-curriculum-design.md`, `src/content/{types,index,validate}.ts`, `src/content/content.test.ts`, `src/lib/demo.ts`, `src/lib/lib.test.ts`, `src/components/{CodePanel,icons}.tsx` + `CodePanel.module.css`, `src/styles/tokens.css`, `src/state/app.ts` + test, `src/storage/progress.ts` + test, `src/App.tsx` + test, `src/screens/{Home,Learn}.tsx` + css, `src/quiz/{session,types,Quiz,QuizEnd,FeedbackSheet,testUtils}.ts(x)` + tests, `e2e/{smoke,double-tap}.spec.ts`.

**Delete:** `src/quiz/grade.ts`, `src/quiz/feedback.ts` (replaced by folders).

Run all commands from the repo root: `/Users/takahiko/repo/cascade-css`.

---

### Task 1: GitHub Actions CI for the current app

**Files:**
- Create: `.nvmrc`, `.github/workflows/ci.yml`
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: existing npm scripts `typecheck`, `test`, `build`, `test:e2e`.
- Produces: `.github/workflows/ci.yml` with jobs `check` and `e2e` (Task 11 adds `rust-content`). `.nvmrc`, which later jobs reuse.

- [ ] **Step 1: Find the current major versions of the actions**

Run: `for a in checkout setup-node upload-artifact; do gh api repos/actions/$a/releases/latest --jq '"\(.tag_name)"'; done`
Expected: three tags like `v5.0.0`. Use their **major** (`@v5`) in the workflow below. The YAML shows `@v5` / `@v5` / `@v4`; replace them if the API reports newer majors.

- [ ] **Step 2: Pin Node**

Create `.nvmrc`:
```
24
```

- [ ] **Step 3: Make Playwright CI-aware**

Replace `playwright.config.ts` with:
```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 5180;
// Read through globalThis: the root tsconfig has no Node types, and a global
// `declare const process` would clash with @types/node (used by scripts/).
const CI = !!(globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.CI;

export default defineConfig({
  testDir: './e2e',
  retries: CI ? 2 : 0,
  reporter: CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
  },
});
```
- [ ] **Step 4: Write the workflow**

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  check:
    name: Typecheck, unit tests, build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build

  e2e:
    name: Playwright
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 5: Run every CI command locally, the CI way**

Run: `npm ci && npm run typecheck && npm test && npm run build && CI=1 npm run test:e2e`
Expected: all pass. The e2e run prints the `list` reporter and writes `playwright-report/` (already git-ignored).

- [ ] **Step 6: Commit**

```bash
git add .nvmrc .github/workflows/ci.yml playwright.config.ts
git commit -m "Add GitHub Actions CI for typecheck, unit tests, build and e2e

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

- [ ] **Step 7: Ask the user to push**

CI only proves itself on GitHub. Ask the user: "May I push branch `multi-course` so the new CI runs?" If yes: `git push -u origin multi-course`, then `gh run watch --exit-status $(gh run list --branch multi-course --limit 1 --json databaseId --jq '.[0].databaseId')`.
Expected: both jobs green. If the user declines, note in the task report that CI has only been run locally.

---

### Task 2: Rename the app to Cascade

**Files:**
- Modify: `package.json`, `package-lock.json`, `index.html`, `README.md`, `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: package name `cascade`, document title `Cascade`.

- [ ] **Step 1: Write the failing test**

In `e2e/smoke.spec.ts`, right after `await page.goto('/');`, add:
```ts
  await expect(page).toHaveTitle('Cascade');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test e2e/smoke.spec.ts`
Expected: FAIL: `Expected: "Cascade"`, `Received: "Cascade — learn CSS"`.

- [ ] **Step 3: Rename**

```bash
npm pkg set name=cascade
npm install --package-lock-only
```
In `index.html`, change `<title>Cascade — learn CSS</title>` to `<title>Cascade</title>`.

In `README.md`, replace the first two paragraphs (the `# Cascade (working title)` heading and the "A Duolingo-style mobile app for learning CSS…" line) with:
```markdown
# Cascade

A Duolingo-style mobile app for learning to code, one course at a time: short **Learn** lessons with live playgrounds, then bite-sized **Practice** quizzes. Courses: CSS (Rust is coming).
```
Leave the rest of the README; Task 15 rewrites it.

- [ ] **Step 4: Run the tests**

Run: `npx playwright test e2e/smoke.spec.ts && npm test`
Expected: PASS. Check that `git diff package-lock.json` only changes the two `"name"` fields.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json index.html README.md e2e/smoke.spec.ts
git commit -m "Rename the app to Cascade

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

- [ ] **Step 6: Rename the GitHub repo (only with the user's explicit yes)**

Ask the user: "Rename GitHub repo `TETRA2000/cascade-css` to `TETRA2000/cascade` now? GitHub redirects the old URL." Only if they say yes:
```bash
gh repo rename cascade --repo TETRA2000/cascade-css --yes
git remote set-url origin git@github.com:TETRA2000/cascade.git
git remote -v
git ls-remote origin HEAD
```
Expected: `origin` shows `TETRA2000/cascade.git` and `ls-remote` prints a hash. Do not rename the local folder.

---

### Task 3: Course-aware content layer

Move CSS content under `content/css/`, add `courses.json`, and make every content lookup take a course. The app still shows only CSS; nothing visible changes.

**Files:**
- Create: `content/courses.json`, `src/content/typeKeys.ts`, `src/content/validateUtil.ts`, `src/content/validateCss.ts`
- Move: `content/{lessons,questions,question-types,topics}.json` → `content/css/`
- Modify: `src/content/types.ts`, `src/content/index.ts`, `src/content/validate.ts`, `src/content/content.test.ts`, `src/lib/lib.test.ts`, `src/quiz/types.ts`, `src/quiz/session.ts`, `src/quiz/session.test.ts`, `src/quiz/grade.test.ts`, `src/quiz/Quiz.tsx`, `src/quiz/QuizEnd.tsx`, `src/quiz/testUtils.tsx`, `src/state/app.ts`, `src/screens/Home.tsx`, `src/screens/Learn.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces (later tasks rely on these exact names):
  - `typeKeys.ts`: `COURSE_IDS`, `type CourseId`, `isCourseId(v: unknown): v is CourseId`, `CSS_TYPE_KEYS`, `type CssTypeKey`, `type QuestionTypeKey`, `TYPE_KEYS: Record<CourseId, readonly QuestionTypeKey[]>`, `COURSE_ICON_NAMES`, `type CourseIconName`.
  - `types.ts`: `CourseInfo`, `ContentBundle`, `Course`, `CssQuestion`, `Question` (= `CssQuestion` for now).
  - `index.ts`: `courses`, `courseInfos`, `bundledCourseIds`, `findCourse(id: string | null): Course | undefined`, `courseById(id: CourseId): Course` (throws `Unknown course "<id>"`), `unitByKey(course, key)`, `questionById(course, id)`, `questionsOfType(course, type)`, `lessonName(course, key)`, `lessonQuestionIds(course, key, random?)`. Re-exports everything from `types.ts` and `typeKeys.ts`.
  - `validate.ts`: `validateCourses(infos: readonly CourseInfo[], bundled: readonly string[]): string[]`, `validateContent(course: Course): string[]`.
  - `validateUtil.ts`: `isStr`, `isInt`, `isStrArr`, `inRange`, `type Err = (where: string, msg: string) => void`.
  - `Session.courseId: CourseId`; `startSession(courseId: CourseId, lessonKey, ids, hearts?)`.
  - `Quiz` prop `courseId: CourseId`; `renderQuiz(lessonKey, options?, guardMs = 0, courseId: CourseId = 'css')`.
  - `AppState.course: CourseId` (always `'css'` in this task; Task 6 makes it nullable).
  - `Home` and `Learn` take a `course: Course` prop.

- [ ] **Step 1: Write the failing tests**

Replace `src/content/content.test.ts` with:
```ts
import { describe, expect, it } from 'vitest';
import { bundledCourseIds, courseById, courseInfos, courses, lessonName, lessonQuestionIds, type CourseId, type CourseInfo } from './index';
import { validateContent, validateCourses } from './validate';

const css = courseById('css');

describe('courses', () => {
  it('lists exactly the bundled courses', () => {
    expect(validateCourses(courseInfos, bundledCourseIds)).toEqual([]);
    expect(courses.map((c) => c.id)).toEqual(courseInfos.map((c) => c.id));
  });

  it('reports malformed, duplicate, unbundled and unlisted courses', () => {
    const info = courseInfos[0]!;
    const bad = [{ ...info, icon: 'nope' }, info, { ...info, id: 'go', name: 7 }] as unknown as CourseInfo[];
    expect(validateCourses(bad, ['css', 'rust'])).toEqual([
      'courses/css: unknown icon "nope"',
      'courses/css: duplicate course id',
      'courses/go: id, name, tagline and blurb must be strings',
      'courses/go: unknown course id',
      'courses/go: no content bundled for this course',
      'courses: bundled course "rust" is not listed',
    ]);
  });

  it('throws for a course that is not bundled', () => {
    expect(() => courseById('nope' as CourseId)).toThrow('Unknown course "nope"');
  });
});

describe.each(courses.map((c) => [c.name, c] as const))('%s content', (_name, course) => {
  it('passes validation', () => {
    expect(validateContent(course)).toEqual([]);
  });
});

describe('css content', () => {
  it('has the expected size', () => {
    expect(css.units).toHaveLength(5);
    expect(css.units.flatMap((u) => u.cards)).toHaveLength(19);
    expect(css.questions).toHaveLength(22);
  });

  it('reports broken content', () => {
    const broken = structuredClone(css);
    (broken.topics as Record<string, string[]>).flex = ['nope'];
    expect(validateContent(broken)).toContain('topics/flex: unknown question id "nope"');
  });
});

describe('lessonQuestionIds', () => {
  it('uses topics for a unit', () => {
    expect(lessonQuestionIds(css, 'topic:grid')).toEqual(['predict-3', 'predict-4', 'build-1']);
  });

  it('uses every question of a type', () => {
    expect(lessonQuestionIds(css, 'bug')).toEqual(['bug-1', 'bug-2', 'bug-3']);
  });

  it('picks one question per type, in difficulty order, for mixed review', () => {
    const ids = lessonQuestionIds(css, 'mixed', () => 0);
    expect(ids).toEqual(['predict-1', 'pairs-1', 'versus-1', 'build-1', 'tune-1', 'bug-1', 'type-1']);
    const types = lessonQuestionIds(css, 'mixed', () => 0.999).map((id) => css.questions.find((q) => q.id === id)?.type);
    expect(types).toEqual(css.questionTypes.map((t) => t.key));
  });
});

describe('lessonName', () => {
  it('names each kind of run', () => {
    expect(lessonName(css, 'mixed')).toBe('Mixed review');
    expect(lessonName(css, 'topic:box')).toBe('The box model — practice');
    expect(lessonName(css, 'tune')).toBe('Tune to target');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/content/content.test.ts`
Expected: FAIL: `courseById` / `validateCourses` are not exported.

- [ ] **Step 3: Move the content files and add `courses.json`**

```bash
mkdir -p content/css
git mv content/lessons.json content/questions.json content/question-types.json content/topics.json content/css/
```
Create `content/courses.json`:
```json
[
  {
    "id": "css",
    "name": "CSS",
    "tagline": "CSS, one tap at a time",
    "blurb": "Selectors, the box model, flexbox and grid, with live playgrounds.",
    "icon": "css"
  }
]
```

- [ ] **Step 4: Add `src/content/typeKeys.ts`**

```ts
// Course ids and question-type keys as values, so validation and progress
// parsing can check untrusted data against them.

export const COURSE_IDS = ['css', 'rust'] as const;
export type CourseId = (typeof COURSE_IDS)[number];

export function isCourseId(v: unknown): v is CourseId {
  return COURSE_IDS.includes(v as CourseId);
}

/** SVGs exported by components/icons.tsx that a course may use. */
export const COURSE_ICON_NAMES = ['css', 'rust'] as const;
export type CourseIconName = (typeof COURSE_ICON_NAMES)[number];

/** CSS question types in difficulty order; css/question-types.json must match. */
export const CSS_TYPE_KEYS = ['predict', 'pairs', 'versus', 'build', 'tune', 'bug', 'type'] as const;
export type CssTypeKey = (typeof CSS_TYPE_KEYS)[number];

export type QuestionTypeKey = CssTypeKey;

/** Each course's question types, in the order its question-types.json must list them. */
export const TYPE_KEYS: Record<CourseId, readonly QuestionTypeKey[]> = {
  css: CSS_TYPE_KEYS,
  rust: [],
};
```

- [ ] **Step 5: Update `src/content/types.ts`**

At the top, below the header comment, add:
```ts
import type { CourseIconName, CourseId, QuestionTypeKey } from './typeKeys';
```
Delete the line `export type QuestionTypeKey = 'predict' | 'pairs' | 'versus' | 'build' | 'tune' | 'bug' | 'type';`. `QuestionTypeInfo.key` keeps the type `QuestionTypeKey` (now imported).

Replace the `export type Question = …` union with:
```ts
export type CssQuestion =
  | PredictQuestion
  | PairsQuestion
  | VersusQuestion
  | BuildQuestion
  | TuneQuestion
  | BugQuestion
  | TypeQuestion;

export type Question = CssQuestion;
```
Append at the end of the file:
```ts
// ----- courses.json -----

export interface CourseInfo {
  id: CourseId;
  name: string;
  /** Shown under the wordmark on Home. */
  tagline: string;
  /** Shown in the course picker. */
  blurb: string;
  icon: CourseIconName;
}

/** One course's four content files. */
export interface ContentBundle {
  units: readonly Unit[];
  questions: readonly Question[];
  questionTypes: readonly QuestionTypeInfo[];
  topics: Topics;
}

export interface Course extends CourseInfo, ContentBundle {}
```

- [ ] **Step 6: Replace `src/content/index.ts`**

```ts
// Typed access to the JSON in /content. Components get a Course from app
// state and use these helpers; they never import the JSON directly.
import coursesJson from '../../content/courses.json';
import cssLessons from '../../content/css/lessons.json';
import cssQuestions from '../../content/css/questions.json';
import cssQuestionTypes from '../../content/css/question-types.json';
import cssTopics from '../../content/css/topics.json';
import type { CourseId } from './typeKeys';
import type { ContentBundle, Course, CourseInfo, LessonKey, Question, QuestionTypeInfo, QuestionTypeKey, Topics, Unit } from './types';

export * from './types';
export * from './typeKeys';

// JSON imports infer wide types (e.g. `string` instead of `'parent'`), so
// these casts are checked at test time by validateContent() instead.
const BUNDLES: Partial<Record<CourseId, ContentBundle>> = {
  css: {
    units: cssLessons as unknown as readonly Unit[],
    questions: cssQuestions as unknown as readonly Question[],
    questionTypes: cssQuestionTypes as unknown as readonly QuestionTypeInfo[],
    topics: cssTopics as Topics,
  },
};

export const courseInfos = coursesJson as unknown as readonly CourseInfo[];

/** Course ids with content in this build. validateCourses() checks courses.json against it. */
export const bundledCourseIds = Object.keys(BUNDLES) as CourseId[];

/** Every listed course that has content, in picker order. */
export const courses: readonly Course[] = courseInfos.flatMap((info) => {
  const bundle = BUNDLES[info.id];
  return bundle ? [{ ...info, ...bundle }] : [];
});

export function findCourse(id: string | null): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function courseById(id: CourseId): Course {
  const course = findCourse(id);
  if (!course) throw new Error(`Unknown course "${id}"`);
  return course;
}

export function unitByKey(course: Course, key: string): Unit | undefined {
  return course.units.find((u) => u.key === key);
}

export function questionById(course: Course, id: string): Question | undefined {
  return course.questions.find((q) => q.id === id);
}

export function questionsOfType(course: Course, type: QuestionTypeKey): Question[] {
  return course.questions.filter((q) => q.type === type);
}

function isTypeKey(course: Course, key: string): key is QuestionTypeKey {
  return course.questionTypes.some((t) => t.key === key);
}

/** Display name for a quiz run, as on the results screen. */
export function lessonName(course: Course, key: LessonKey): string {
  if (key === 'mixed') return 'Mixed review';
  if (key.startsWith('topic:')) return (unitByKey(course, key.slice(6))?.name ?? '') + ' — practice';
  return course.questionTypes.find((t) => t.key === key)?.name ?? '';
}

/**
 * The initial question queue for a quiz run.
 * Mixed review = one random question per type, in question-types.json order.
 */
export function lessonQuestionIds(course: Course, key: LessonKey, random: () => number = Math.random): string[] {
  if (key === 'mixed') {
    return course.questionTypes.flatMap((t) => {
      const list = questionsOfType(course, t.key);
      const pick = list[Math.floor(random() * list.length)];
      return pick ? [pick.id] : [];
    });
  }
  if (key.startsWith('topic:')) return [...(course.topics[key.slice(6)] ?? [])];
  if (isTypeKey(course, key)) return questionsOfType(course, key).map((q) => q.id);
  return [];
}
```

- [ ] **Step 7: Split the validator**

Create `src/content/validateUtil.ts`:
```ts
// Small type checks shared by the content validators.
export type Err = (where: string, msg: string) => void;

export const isStr = (v: unknown): v is string => typeof v === 'string';
export const isInt = (v: unknown): v is number => Number.isInteger(v);
export const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
export const inRange = (i: unknown, len: number) => isInt(i) && i >= 0 && i < len;
```

Create `src/content/validateCss.ts`. Move the two functions `validateDemo` and `validateQuestion` out of `validate.ts` into it **unchanged in body**, renamed and exported:
```ts
// Checks for CSS-course demos and questions.
import { sanitizeCssKeyword } from '../lib/sanitize';
import type { CssQuestion, Demo } from './types';
import { inRange, isInt, isStr, isStrArr, type Err } from './validateUtil';

export function validateCssDemo(d: Demo, at: string, err: Err) {
  // … body of the old validateDemo, unchanged …
}

export function validateCssQuestion(q: CssQuestion, at: string, err: Err) {
  // … body of the old validateQuestion, unchanged …
}
```
(Copy the bodies verbatim from the current `validate.ts`, lines `function validateDemo(…) {` through the end of the file.)

Replace `src/content/validate.ts` with:
```ts
// Runtime checks for the content JSON. The typed exports in ./index.ts are
// unchecked casts, so this is what guarantees they tell the truth.
// Each function returns a list of human-readable problems; empty means valid.
import { COURSE_ICON_NAMES, isCourseId, TYPE_KEYS } from './typeKeys';
import type { Course, CourseInfo } from './types';
import { validateCssDemo, validateCssQuestion } from './validateCss';
import { isStr, isStrArr } from './validateUtil';

/** courses.json against the course ids this build bundles content for. */
export function validateCourses(infos: readonly CourseInfo[], bundled: readonly string[]): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
  const ids = infos.map((c) => c.id);
  infos.forEach((c, i) => {
    const at = `courses/${c.id ?? i}`;
    if (![c.id, c.name, c.tagline, c.blurb].every(isStr)) err(at, 'id, name, tagline and blurb must be strings');
    if (!isCourseId(c.id)) err(at, 'unknown course id');
    if (!COURSE_ICON_NAMES.includes(c.icon)) err(at, `unknown icon "${String(c.icon)}"`);
    if (ids.indexOf(c.id) !== i) err(at, 'duplicate course id');
    if (!bundled.includes(c.id)) err(at, 'no content bundled for this course');
  });
  bundled.forEach((id) => {
    if (!ids.includes(id as CourseInfo['id'])) err('courses', `bundled course "${id}" is not listed`);
  });
  return errors;
}

export function validateContent(c: Course): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
  const keys = TYPE_KEYS[c.id];

  // question-types.json
  const typeKeys = c.questionTypes.map((t) => t.key);
  if (typeKeys.join() !== keys.join()) err('question-types', `expected keys ${keys.join(', ')} in order`);
  c.questionTypes.forEach((t) => {
    if (!isStr(t.name) || !isStr(t.blurb)) err(`question-types/${t.key}`, 'name and blurb must be strings');
  });

  // lessons.json
  const unitKeys = new Set<string>();
  c.units.forEach((u, ui) => {
    const at = `lessons/${u.key ?? ui}`;
    if (!isStr(u.key) || !isStr(u.name) || !isStr(u.blurb)) err(at, 'key, name and blurb must be strings');
    if (unitKeys.has(u.key)) err(at, 'duplicate unit key');
    unitKeys.add(u.key);
    if (!Array.isArray(u.cards) || u.cards.length === 0) return err(at, 'needs at least one card');
    u.cards.forEach((card, ci) => {
      const cat = `${at}/card ${ci + 1}`;
      if (!isStr(card.title) || !isStr(card.body)) err(cat, 'title and body must be strings');
      if (card.tip !== undefined && !isStr(card.tip)) err(cat, 'tip must be a string');
      if (card.body && card.body.split('`').length % 2 === 0) err(cat, 'body has an unmatched backtick');
      if (card.tip && card.tip.split('`').length % 2 === 0) err(cat, 'tip has an unmatched backtick');
      if (card.demo) validateCssDemo(card.demo, cat, err);
    });
  });

  // questions.json
  const ids = new Set<string>();
  c.questions.forEach((q, qi) => {
    const at = `questions/${q.id ?? qi}`;
    if (!isStr(q.id) || !isStr(q.prompt) || !isStr(q.explain)) err(at, 'id, prompt and explain must be strings');
    if (ids.has(q.id)) err(at, 'duplicate id');
    ids.add(q.id);
    if (!keys.includes(q.type)) return err(at, `unknown type "${String(q.type)}"`);
    if (q.explain && q.explain.split('`').length % 2 === 0) err(at, 'explain has an unmatched backtick');
    validateCssQuestion(q, at, err);
  });
  keys.forEach((t) => {
    if (!c.questions.some((q) => q.type === t)) err('questions', `no question of type "${t}" (mixed review needs one)`);
  });

  // topics.json
  unitKeys.forEach((k) => {
    if (!c.topics[k]) err(`topics`, `missing entry for unit "${k}"`);
  });
  Object.entries(c.topics).forEach(([k, list]) => {
    if (!unitKeys.has(k)) err(`topics/${k}`, 'no unit with this key');
    if (!isStrArr(list) || list.length === 0) return err(`topics/${k}`, 'must be a non-empty list of ids');
    list.forEach((id) => {
      if (!ids.has(id)) err(`topics/${k}`, `unknown question id "${id}"`);
    });
  });

  return errors;
}
```

- [ ] **Step 8: Run the content tests**

Run: `npx vitest run src/content/content.test.ts`
Expected: PASS (7 tests). The rest of the suite doesn't compile yet; continue.

- [ ] **Step 9: Record the course on the quiz session**

In `src/quiz/types.ts`, change the import to `import type { CourseId, LessonKey } from '../content';` and add as the first field of `Session`:
```ts
  /** The course whose questions this run uses. */
  courseId: CourseId;
```

In `src/quiz/session.ts`:
- Change the content import to `import { courseById, questionById, type CourseId, type LessonKey, type PairsQuestion, type Question } from '../content';`
- Add below the imports:
  ```ts
  const lookup = (courseId: CourseId, id: string) => questionById(courseById(courseId), id);
  ```
- Replace `startSession` with:
  ```ts
  export function startSession(courseId: CourseId, lessonKey: LessonKey, ids: readonly string[], hearts = HEARTS_PER_LESSON): Session {
    const queue = ids.filter((id) => lookup(courseId, id));
    return {
      courseId,
      lessonKey,
      queue,
      idx: 0,
      total: queue.length,
      hearts,
      solved: 0,
      firstTry: 0,
      xp: 0,
      missed: {},
      answer: freshAnswer(queue[0] === undefined ? undefined : lookup(courseId, queue[0])),
      phase: queue.length ? 'question' : 'done',
    };
  }
  ```
- In `currentQuestion`, replace `questionById(id)` with `lookup(s.courseId, id)`.
- In `sessionReducer`: `if (action.type === 'start') return startSession(s.courseId, action.lessonKey, action.ids);` and in `case 'next'` replace `freshAnswer(questionById(id))` with `freshAnswer(lookup(s.courseId, id))`.

- [ ] **Step 10: Thread the course through the quiz UI**

`src/quiz/Quiz.tsx`:
- Import: `import { courseById, lessonQuestionIds, type CourseId, type LessonKey } from '../content';`
- Add to `Props`: `courseId: CourseId;`
- Replace the first two lines of `Quiz` with:
  ```tsx
  export function Quiz({ courseId, lessonKey, onExit, onComplete, guardMs = ACTIVATION_GUARD_MS }: Props) {
    const course = courseById(courseId);
    const [session, dispatch] = useReducer(sessionReducer, lessonKey, (key) =>
      startSession(courseId, key, lessonQuestionIds(course, key)),
    );
    const restart = () => dispatch({ type: 'start', lessonKey, ids: lessonQuestionIds(course, lessonKey) });
  ```
- In `QuizQuestion`, replace `questionTypes.find((t) => t.key === q.type)?.name` with `courseById(session.courseId).questionTypes.find((t) => t.key === q.type)?.name`.

`src/quiz/QuizEnd.tsx`: import `courseById` alongside `lessonName`, and render `{lessonName(courseById(session.courseId), session.lessonKey)}`.

`src/quiz/testUtils.tsx`:
```tsx
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { CourseId, LessonKey } from '../content';
import { Quiz } from './Quiz';

/**
 * Render a quiz run for `lessonKey` (a question type key gives all questions of that type, in file order).
 * The double-tap guard is off (0 ms) unless `guardMs` is given, so tests can click Check then Continue at once.
 */
export function renderQuiz(
  lessonKey: LessonKey,
  options: Parameters<typeof userEvent.setup>[0] = {},
  guardMs = 0,
  courseId: CourseId = 'css',
) {
  const onExit = vi.fn();
  const onComplete = vi.fn();
  const user = userEvent.setup(options);
  render(<Quiz courseId={courseId} lessonKey={lessonKey} onExit={onExit} onComplete={onComplete} guardMs={guardMs} />);
  return { user, onExit, onComplete };
}
```

- [ ] **Step 11: Thread the course through the app shell**

`src/state/app.ts`:
- Import: `import { courseById, unitByKey, type Course, type CourseId, type LessonKey } from '../content';`
- Add to `AppState` (first field): `/** The active course. */ course: CourseId;` and to `initialState`: `course: 'css',`.
- Change `cardScreen` to take the course:
  ```ts
  function cardScreen(course: Course, unitKey: string, card: number): Screen | null {
    const unit = unitByKey(course, unitKey);
  ```
  and its two call sites to `cardScreen(courseById(state.course), action.unitKey, 0)` and `cardScreen(courseById(state.course), screen.unitKey, action.card)`.

`src/screens/Learn.tsx`: import `type Course` from `'../content'` alongside `unitByKey`, add `course: Course;` to `Props`, destructure it, and use `unitByKey(course, unitKey)`.

`src/screens/Home.tsx`:
- Import: `import { questionsOfType, type Course } from '../content';`
- `Props` gains `course: Course;`. `Home`, `LearnTab` and `PracticeTab` destructure it.
- In `LearnTab`: `units` → `course.units` (three places).
- In `PracticeTab`: `questionTypes` → `course.questionTypes` (two places) and `questionsOfType(t.key)` → `questionsOfType(course, t.key)`.
- Pass it down: `<LearnTab course={course} state={state} dispatch={dispatch} />` (same for `PracticeTab`).

`src/App.tsx`: import `courseById` from `'./content'`, compute `const course = courseById(state.course);` after the reducer, and pass `course={course}` to `<Home>` and `<Learn>`, and `courseId={course.id}` to `<Quiz>`.

- [ ] **Step 12: Update test call sites**

```bash
sed -i '' "s/startSession('/startSession('css', '/g" src/quiz/session.test.ts
```
`src/quiz/grade.test.ts`: change the import to `import { courseById, questionById, type BuildQuestion, type Question, type TuneQuestion, type TypeQuestion } from '../content';` and the helper to:
```ts
const q = <T extends Question = Question>(id: string) => questionById(courseById('css'), id) as T;
```
`src/lib/lib.test.ts`: change `import { units, type ChoiceDemo, type KnobDemo } from '../content';` to `import { courseById, type ChoiceDemo, type KnobDemo } from '../content';` and the `card` helper to use `courseById('css').units.find(…)`.

- [ ] **Step 13: Run everything**

Run: `npm run typecheck && npm test && npx playwright test`
Expected: all PASS, with the same test count as before plus the new content tests.

- [ ] **Step 14: Commit**

```bash
git add -A content src
git commit -m "Make content lookups course-aware and move CSS content under content/css

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---

### Task 4: Split quiz rendering, grading and feedback by course family

A pure refactor that makes room for Rust: CSS renderers move into `renderers/css/`, and grading and feedback become folders with a `css` module. No behavior change.

**Files:**
- Move: `src/quiz/renderers/{Bug,Build,Pairs,Predict,Tune,TypeValue,Versus}.{tsx,module.css,test.tsx}` and `preview.module.css` → `src/quiz/renderers/css/`
- Create: `src/quiz/renderers/css/CssQuestionBody.tsx`, `src/quiz/grade/index.ts`, `src/quiz/grade/css.ts`, `src/quiz/feedback/index.ts`, `src/quiz/feedback/shared.ts`, `src/quiz/feedback/css.ts`
- Modify: `src/quiz/renderers/QuestionBody.tsx`
- Delete: `src/quiz/grade.ts`, `src/quiz/feedback.ts`

**Interfaces:**
- Consumes: `CssQuestion` (Task 3).
- Produces:
  - `grade/index.ts`: `freshAnswer(q)`, `canCheck(q, a)`, `isCorrect(q, a)` (same signatures as before).
  - `grade/css.ts`: `canCheckCss(q: CssQuestion, a): boolean`, `isCorrectCss(q: CssQuestion, a): boolean`.
  - `feedback/shared.ts`: `PRAISE`, `interface FeedbackText { title: string; detail: string | null }`, `optionLetter(i: number): string`, `pairsSummary(misses: number): string`.
  - `feedback/css.ts`: `cssFeedback(q: CssQuestion, a, praise: string): FeedbackText`.
  - `feedback/index.ts`: `feedbackText(q, a, index)`, re-exports `FeedbackText`.
  - `renderers/css/CssQuestionBody.tsx`: `CssQuestionBody(props: RendererProps<CssQuestion>)`.
  - Imports of `./grade` and `./feedback` elsewhere keep working (directory `index.ts`).

- [ ] **Step 1: Move the CSS renderers**

```bash
cd src/quiz/renderers
mkdir css
for f in Bug Build Pairs Predict Tune TypeValue Versus; do
  git mv $f.tsx $f.module.css css/
  [ -f $f.test.tsx ] && git mv $f.test.tsx css/
done
git mv preview.module.css css/
cd css
sed -i '' -e "s#from '\.\./#from '../../#g" -e "s#from '\./types'#from '../types'#g" *.tsx
cd /Users/takahiko/repo/cascade-css
```
The `sed` adds one `../` to every parent-relative import (`../../content` → `../../../content`, `../tone` → `../../tone`, `../testUtils` → `../../testUtils`) and points `./types` at the shared `renderers/types.ts`. Sibling imports (`./Bug.module.css`, `./preview.module.css`) stay as they are.

- [ ] **Step 2: Add `CssQuestionBody` and slim `QuestionBody`**

Create `src/quiz/renderers/css/CssQuestionBody.tsx` with the switch that is in `QuestionBody.tsx` today:
```tsx
import type { CssQuestion } from '../../../content';
import type { RendererProps } from '../types';
import { Bug } from './Bug';
import { Build } from './Build';
import { Pairs } from './Pairs';
import { Predict } from './Predict';
import { Tune } from './Tune';
import { TypeValue } from './TypeValue';
import { Versus } from './Versus';

export function CssQuestionBody({ question, answer, act }: RendererProps<CssQuestion>) {
  switch (question.type) {
    case 'predict':
      return <Predict question={question} answer={answer} act={act} />;
    case 'pairs':
      return <Pairs question={question} answer={answer} act={act} />;
    case 'versus':
      return <Versus question={question} answer={answer} act={act} />;
    case 'build':
      return <Build question={question} answer={answer} act={act} />;
    case 'tune':
      return <Tune question={question} answer={answer} act={act} />;
    case 'bug':
      return <Bug question={question} answer={answer} act={act} />;
    case 'type':
      return <TypeValue question={question} answer={answer} act={act} />;
  }
}
```
Replace `src/quiz/renderers/QuestionBody.tsx` with:
```tsx
import type { Question } from '../../content';
import { CssQuestionBody } from './css/CssQuestionBody';
import type { RendererProps } from './types';

/** The middle of the quiz screen for one question. */
export function QuestionBody(props: RendererProps<Question>) {
  return <CssQuestionBody {...props} />;
}
```

- [ ] **Step 3: Split grading**

```bash
mkdir src/quiz/grade
git mv src/quiz/grade.ts src/quiz/grade/css.ts
```
Edit `src/quiz/grade/css.ts` so it only holds the per-type rules for CSS:
```ts
// CSS answer rules — a port of check() in the prototype.
import type { CssQuestion } from '../../content';
import { sanitizeCssKeyword } from '../../lib/sanitize';
import type { AnswerState } from '../types';

/** Whether Check is enabled (the caller has already ruled out a checked answer). Pairs has no Check. */
export function canCheckCss(q: CssQuestion, a: AnswerState): boolean {
  switch (q.type) {
    case 'predict':
    case 'versus':
    case 'bug':
      return a.sel !== null;
    case 'build':
      return a.slots.every((s) => s !== null);
    case 'tune':
      return true;
    case 'type':
      return a.val.trim().length > 0;
    case 'pairs':
      return false;
  }
}

export function isCorrectCss(q: CssQuestion, a: AnswerState): boolean {
  switch (q.type) {
    case 'predict':
    case 'versus':
    case 'bug':
      return a.sel === q.answer;
    case 'build':
      return a.slots.every((ci, i) => ci !== null && q.bank[ci] === q.answer[i]);
    case 'tune':
      return a.num === q.target;
    case 'type':
      return q.accept.includes(sanitizeCssKeyword(a.val));
    case 'pairs':
      return q.items.every((it) => a.matched[it.id]);
  }
}
```
Create `src/quiz/grade/index.ts`:
```ts
// Answer rules — a port of freshQ() and check() in the prototype, split by course family.
import type { Question } from '../../content';
import type { AnswerState } from '../types';
import { canCheckCss, isCorrectCss } from './css';

export function freshAnswer(q: Question | undefined): AnswerState {
  return {
    sel: null,
    slots: q?.type === 'build' ? q.answer.map(() => null) : [],
    num: q?.type === 'tune' ? q.start : 0,
    val: '',
    left: null,
    right: null,
    matched: {},
    miss: null,
    misses: 0,
    checked: false,
    ok: false,
  };
}

/** Whether the Check button is enabled. Pairs has no Check: it completes itself. */
export function canCheck(q: Question, a: AnswerState): boolean {
  if (a.checked) return false;
  return canCheckCss(q, a);
}

export function isCorrect(q: Question, a: AnswerState): boolean {
  return isCorrectCss(q, a);
}
```

- [ ] **Step 4: Split feedback**

```bash
mkdir src/quiz/feedback
git mv src/quiz/feedback.ts src/quiz/feedback/css.ts
```
Create `src/quiz/feedback/shared.ts`:
```ts
// Feedback copy shared by every course.
export const PRAISE = ['Nice — that’s right!', 'Nailed it!', 'Exactly right!', 'Sharp eye!'];

export interface FeedbackText {
  title: string;
  /** Bold line under the title ("Answer: …"), or null when there is none to show. */
  detail: string | null;
}

export const optionLetter = (i: number) => String.fromCharCode(65 + i);

export function pairsSummary(misses: number): string {
  return misses === 0 ? 'Flawless — no mismatches.' : `${misses} ${misses === 1 ? 'mismatch' : 'mismatches'} along the way.`;
}
```
Rewrite `src/quiz/feedback/css.ts`, keeping every string identical:
```ts
// CSS feedback copy — ported from renderVals() in the prototype.
import type { CssQuestion } from '../../content';
import type { AnswerState } from '../types';
import { optionLetter, pairsSummary, type FeedbackText } from './shared';

export function cssFeedback(q: CssQuestion, a: AnswerState, praise: string): FeedbackText {
  let title = a.ok ? praise : 'Not quite';
  if (q.type === 'pairs') title = 'All pairs matched!';
  if (!a.ok && q.type === 'versus') title = `Not quite — it’s ${q.answer}`;
  if (!a.ok && q.type === 'bug') title = `Not that one — it’s line ${q.answer}`;
  if (!a.ok && q.type === 'tune') title = 'Close, but not aligned';

  const line = answerLine(q, a);
  if (q.type === 'pairs') return { title, detail: line };
  return { title, detail: !a.ok && line ? line : null };
}

function answerLine(q: CssQuestion, a: AnswerState): string {
  switch (q.type) {
    case 'predict':
      return `Answer: ${optionLetter(q.answer)}`;
    case 'pairs':
      return pairsSummary(a.misses);
    case 'build':
      return 'Answer: ' + q.props.map((p, i) => `${p}: ${q.answer[i]};`).join(' ');
    case 'tune':
      return `You set ${a.num}${q.unit} — the target is ${q.target}${q.unit}.`;
    case 'type':
      return `Answer: ${q.prop}: ${q.accept[0]};`;
    case 'versus':
    case 'bug':
      return '';
  }
}
```
Create `src/quiz/feedback/index.ts`:
```ts
// Feedback sheet copy, split by course family.
import type { Question } from '../../content';
import type { AnswerState } from '../types';
import { cssFeedback } from './css';
import { PRAISE, type FeedbackText } from './shared';

export type { FeedbackText } from './shared';

/** `index` is the question's position in the queue; it rotates the praise. */
export function feedbackText(q: Question, a: AnswerState, index: number): FeedbackText {
  return cssFeedback(q, a, PRAISE[index % PRAISE.length]!);
}
```

- [ ] **Step 5: Run everything**

Run: `npm run typecheck && npm test`
Expected: PASS with the same test count as after Task 3. `git status` shows renames, not deletions plus additions, for the moved renderers.

- [ ] **Step 6: Commit**

```bash
git add -A src/quiz
git commit -m "Split quiz renderers, grading and feedback by course family

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---
### Task 5: Progress v2 storage with v1 migration

Store progress per course under `cascade.progress.v2`, migrating v1 once. The app still shows only CSS: `App.tsx` gets a small CSS-only adapter here, which Task 6 replaces.

**Files:**
- Modify: `src/storage/progress.ts`, `src/storage/progress.test.ts`, `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `COURSE_IDS`, `isCourseId`, `CourseId`, `LessonKey` from `src/content` (Task 3).
- Produces:
  - `interface CourseProgress { completedUnits: Record<string, true>; completedSets: Partial<Record<LessonKey, true>>; xp: number }`
  - `interface Progress { activeCourse: CourseId | null; courses: Partial<Record<CourseId, CourseProgress>> }`
  - `ProgressStore` (unchanged shape: `load(): Progress`, `save(p: Progress): void`)
  - `STORAGE_KEY = 'cascade.progress.v2'`, `LEGACY_STORAGE_KEY = 'cascade.progress.v1'`
  - `emptyProgress()`, `emptyCourseProgress()`, `parseProgress(raw)`, `migrateV1(raw): Progress | null`, `totalXp(p: Pick<Progress, 'courses'>): number`, `localProgressStore(getStorage?)`

- [ ] **Step 1: Write the failing tests**

Replace `src/storage/progress.test.ts` with:
```ts
import { describe, expect, it } from 'vitest';
import {
  emptyProgress,
  LEGACY_STORAGE_KEY,
  localProgressStore,
  migrateV1,
  parseProgress,
  STORAGE_KEY,
  totalXp,
  type CourseProgress,
  type Progress,
} from './progress';

const cssOnly = (patch: Partial<CourseProgress> = {}): Progress => ({
  activeCourse: 'css',
  courses: { css: { completedUnits: {}, completedSets: {}, xp: 0, ...patch } },
});

describe('parseProgress', () => {
  it('returns empty progress for missing or corrupt data', () => {
    for (const raw of [null, '{not json', '"a string"', 'null', '[]']) expect(parseProgress(raw)).toEqual(emptyProgress());
  });

  it('keeps only well-formed fields and known courses', () => {
    const raw = JSON.stringify({
      activeCourse: 'go',
      courses: {
        css: { completedUnits: { box: true, flex: 'yes' }, completedSets: ['bug'], xp: 'lots' },
        go: { xp: 5 },
        rust: 'nope',
      },
    });
    expect(parseProgress(raw)).toEqual({ activeCourse: null, courses: { css: { completedUnits: { box: true }, completedSets: {}, xp: 0 } } });
  });

  it('floors XP and drops negatives', () => {
    expect(parseProgress(JSON.stringify({ courses: { css: { xp: 42.7 } } })).courses.css?.xp).toBe(42);
    expect(parseProgress(JSON.stringify({ courses: { css: { xp: -5 } } })).courses.css?.xp).toBe(0);
  });

  it('keeps a known active course', () => {
    expect(parseProgress(JSON.stringify({ activeCourse: 'rust', courses: {} })).activeCourse).toBe('rust');
  });
});

describe('migrateV1', () => {
  it('moves v1 progress into the CSS course and makes it active', () => {
    const v1 = JSON.stringify({ completedUnits: { grid: true }, completedSets: { mixed: true }, totalXp: 40 });
    expect(migrateV1(v1)).toEqual(cssOnly({ completedUnits: { grid: true }, completedSets: { mixed: true }, xp: 40 }));
  });

  it('ignores missing, corrupt or empty v1 data', () => {
    expect(migrateV1(null)).toBeNull();
    expect(migrateV1('{oops')).toBeNull();
    expect(migrateV1(JSON.stringify({ completedUnits: {}, completedSets: {}, totalXp: 0 }))).toBeNull();
  });
});

describe('totalXp', () => {
  it('sums every course', () => {
    expect(totalXp({ courses: { css: { completedUnits: {}, completedSets: {}, xp: 30 }, rust: { completedUnits: {}, completedSets: {}, xp: 15 } } })).toBe(45);
    expect(totalXp(emptyProgress())).toBe(0);
  });
});

describe('localProgressStore', () => {
  it('round-trips through localStorage under the v2 key', () => {
    const store = localProgressStore();
    const progress = cssOnly({ completedUnits: { grid: true }, completedSets: { 'topic:grid': true }, xp: 25 });
    store.save(progress);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(progress);
    expect(store.load()).toEqual(progress);
  });

  it('migrates v1 progress when there is no v2 yet, leaving v1 untouched', () => {
    const v1 = JSON.stringify({ completedUnits: {}, completedSets: {}, totalXp: 25 });
    localStorage.setItem(LEGACY_STORAGE_KEY, v1);
    expect(localProgressStore().load()).toEqual(cssOnly({ xp: 25 }));
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(v1);
  });

  it('prefers v2 over v1', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ totalXp: 25 }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cssOnly({ xp: 10 })));
    expect(totalXp(localProgressStore().load())).toBe(10);
  });

  it('degrades gracefully when storage throws (private mode, quota)', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    } as unknown as Storage;
    const store = localProgressStore(() => broken);
    expect(store.load()).toEqual(emptyProgress());
    expect(() => store.save(emptyProgress())).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/storage/progress.test.ts`
Expected: FAIL: `migrateV1`, `totalXp` and `LEGACY_STORAGE_KEY` are not exported.

- [ ] **Step 3: Rewrite `src/storage/progress.ts`**

```ts
// Learner progress persistence. Everything goes through ProgressStore so a
// backend can replace localStorage without touching the app.
import { COURSE_IDS, isCourseId, type CourseId, type LessonKey } from '../content';

export interface CourseProgress {
  completedUnits: Record<string, true>;
  completedSets: Partial<Record<LessonKey, true>>;
  xp: number;
}

export interface Progress {
  /** The course Home shows; null until the learner picks one. */
  activeCourse: CourseId | null;
  courses: Partial<Record<CourseId, CourseProgress>>;
}

export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): void;
}

export const STORAGE_KEY = 'cascade.progress.v2';
/** CSS-only progress from before courses existed. Read once to migrate; never written. */
export const LEGACY_STORAGE_KEY = 'cascade.progress.v1';

export const emptyCourseProgress = (): CourseProgress => ({ completedUnits: {}, completedSets: {}, xp: 0 });
export const emptyProgress = (): Progress => ({ activeCourse: null, courses: {} });

/** XP across every course. Derived, never stored, so it can't drift. */
export function totalXp(p: Pick<Progress, 'courses'>): number {
  return Object.values(p.courses).reduce((sum, c) => sum + (c?.xp ?? 0), 0);
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return asObject(JSON.parse(raw));
  } catch {
    return null;
  }
}

function trueKeys(value: unknown): Record<string, true> {
  return Object.fromEntries(
    Object.entries(asObject(value) ?? {})
      .filter(([, v]) => v === true)
      .map(([k]) => [k, true as const]),
  );
}

function wholeXp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function courseProgress(units: unknown, sets: unknown, xp: unknown): CourseProgress {
  return {
    completedUnits: trueKeys(units),
    completedSets: trueKeys(sets) as Partial<Record<LessonKey, true>>,
    xp: wholeXp(xp),
  };
}

/** Parse stored v2 progress. Missing, malformed or foreign data becomes empty progress; never throws. */
export function parseProgress(raw: string | null): Progress {
  const d = parseJson(raw);
  if (!d) return emptyProgress();
  const stored = asObject(d.courses) ?? {};
  const courses: Progress['courses'] = {};
  for (const id of COURSE_IDS) {
    const c = asObject(stored[id]);
    if (c) courses[id] = courseProgress(c.completedUnits, c.completedSets, c.xp);
  }
  return { activeCourse: isCourseId(d.activeCourse) ? d.activeCourse : null, courses };
}

/** v1 (CSS-only) progress as v2, or null when there's nothing worth migrating. */
export function migrateV1(raw: string | null): Progress | null {
  const d = parseJson(raw);
  if (!d) return null;
  const css = courseProgress(d.completedUnits, d.completedSets, d.totalXp);
  const empty = !Object.keys(css.completedUnits).length && !Object.keys(css.completedSets).length && css.xp === 0;
  return empty ? null : { activeCourse: 'css', courses: { css } };
}

function browserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage; // accessing it can throw when storage is blocked
  } catch {
    return undefined;
  }
}

export function localProgressStore(getStorage: () => Storage | undefined = browserStorage): ProgressStore {
  return {
    load() {
      try {
        const storage = getStorage();
        const raw = storage?.getItem(STORAGE_KEY) ?? null;
        if (raw !== null) return parseProgress(raw);
        return migrateV1(storage?.getItem(LEGACY_STORAGE_KEY) ?? null) ?? emptyProgress();
      } catch {
        return emptyProgress();
      }
    },
    save(progress) {
      try {
        getStorage()?.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch {
        // Full or blocked storage: progress lives on in memory for this session.
      }
    },
  };
}
```

- [ ] **Step 4: Run the storage tests**

Run: `npx vitest run src/storage/progress.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Adapt `App.tsx` (CSS-only until Task 6)**

In `src/App.tsx`, import `emptyCourseProgress` alongside `localProgressStore`, and replace the reducer initializer and the save effect with:
```tsx
  // CSS-only bridge between v2 storage and the single-course AppState.
  const [state, dispatch] = useReducer(appReducer, store, (s) => {
    const css = s.load().courses.css ?? emptyCourseProgress();
    return { ...initialState, completedUnits: css.completedUnits, completedSets: css.completedSets, totalXp: css.xp };
  });
  const { screen, completedUnits, completedSets, totalXp } = state;

  useEffect(() => {
    store.save({ activeCourse: 'css', courses: { css: { completedUnits, completedSets, xp: totalXp } } });
  }, [store, completedUnits, completedSets, totalXp]);
```
Task 6 deletes this bridge.

- [ ] **Step 6: Update the App persistence tests**

In `src/App.test.tsx`, change the storage import to `import { LEGACY_STORAGE_KEY, STORAGE_KEY } from './storage/progress';` and replace the `describe('Persistence', …)` block with:
```tsx
describe('Persistence', () => {
  it('restores completed units and XP from storage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeCourse: 'css', courses: { css: { completedUnits: { basics: true }, completedSets: {}, xp: 40 } } }),
    );
    render(<App />);
    expect(screen.getByText('40 XP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How CSS works, 3 cards, completed' })).toBeInTheDocument();
    expect(screen.getByText('Up next')).toBeInTheDocument();
  });

  it('migrates v1 progress into the CSS course', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ completedUnits: { basics: true }, completedSets: {}, totalXp: 40 }));
    render(<App />);
    expect(screen.getByText('40 XP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How CSS works, 3 cards, completed' })).toBeInTheDocument();
  });

  it('saves progress when a unit is finished', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Grid basics, 4 cards' }));
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
      activeCourse: 'css',
      courses: { css: { completedUnits: { grid: true }, xp: 0 } },
    });
  });

  it('starts fresh when stored progress is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    render(<App />);
    expect(screen.getByText('0 XP')).toBeInTheDocument();
    expect(screen.getByText('Start here')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run everything**

Run: `npm run typecheck && npm test && npx playwright test`
Expected: all PASS. The e2e reload step now reads v2.

- [ ] **Step 8: Commit**

```bash
git add src/storage src/App.tsx src/App.test.tsx
git commit -m "Store progress per course under a v2 key and migrate v1 progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---

### Task 6: Course state, course picker and header chip

**Files:**
- Create: `src/screens/Courses.tsx`, `src/screens/Courses.module.css`, `e2e/migration.spec.ts`
- Modify: `src/state/app.ts`, `src/state/app.test.ts`, `src/App.tsx`, `src/App.test.tsx`, `src/screens/Home.tsx`, `src/screens/Home.module.css`, `src/components/icons.tsx`, `e2e/smoke.spec.ts`, `e2e/double-tap.spec.ts`

**Interfaces:**
- Consumes: `Progress`, `CourseProgress`, `emptyCourseProgress`, `totalXp` (Task 5); `courses`, `findCourse`, `courseById`, `Course`, `CourseId`, `CourseIconName` (Task 3).
- Produces:
  - `AppState = { screen; tab; course: CourseId | null; courses: Partial<Record<CourseId, CourseProgress>> }`
  - `Screen` gains `{ name: 'courses' }`. `Action` gains `{ type: 'openCourses' }` and `{ type: 'selectCourse'; course: CourseId }`.
  - `initialState` (picker, no course), `stateFromProgress(p: Progress): AppState`, `progressFromState(s: AppState): Progress`, `courseProgress(s: AppState, id?: CourseId | null): CourseProgress`
  - `Courses({ state, dispatch })` screen.
  - icons: `CssIcon`, `RustIcon`, `CourseIcon({ name, ...IconProps })`, `ChevronLeftIcon`, `ChevronDownIcon`.

- [ ] **Step 1: Write the failing reducer tests**

Replace `src/state/app.test.ts` with:
```ts
import { describe, expect, it } from 'vitest';
import type { CourseId } from '../content';
import type { CourseProgress } from '../storage/progress';
import { appReducer, courseProgress, initialState, progressFromState, stateFromProgress, type Action, type AppState } from './app';

const inCss: AppState = { ...initialState, course: 'css', screen: { name: 'home' } };
const run = (...actions: Action[]): AppState => actions.reduce(appReducer, inCss);

describe('appReducer', () => {
  it('opens a unit on its first card with the knobs at their start values', () => {
    const s = run({ type: 'openUnit', unitKey: 'basics' });
    expect(s.screen).toEqual({ name: 'learn', unitKey: 'basics', card: 0, selection: [1, 1] });
  });

  it('ignores unknown units and out-of-range cards', () => {
    expect(run({ type: 'openUnit', unitKey: 'nope' }).screen).toEqual({ name: 'home' });
    const s = run({ type: 'openUnit', unitKey: 'grid' }, { type: 'gotoCard', card: 99 });
    expect(s.screen).toMatchObject({ card: 0 });
  });

  it('resets the playground when changing cards', () => {
    const s = run(
      { type: 'openUnit', unitKey: 'flex' },
      { type: 'pickOption', control: 0, option: 1 },
      { type: 'gotoCard', card: 1 },
      { type: 'gotoCard', card: 0 },
    );
    expect(s.screen).toMatchObject({ card: 0, selection: [0] });
  });

  it('records knob picks', () => {
    const s = run({ type: 'openUnit', unitKey: 'basics' }, { type: 'pickOption', control: 1, option: 2 });
    expect(s.screen).toMatchObject({ selection: [1, 2] });
  });

  it('Done marks the unit complete and returns to the Learn tab', () => {
    const s = run({ type: 'selectTab', tab: 'practice' }, { type: 'openUnit', unitKey: 'box' }, { type: 'finishUnit', practice: false });
    expect(courseProgress(s).completedUnits).toEqual({ box: true });
    expect(s.screen).toEqual({ name: 'home' });
    expect(s.tab).toBe('learn');
  });

  it('Practice this marks the unit complete and starts its topic quiz', () => {
    const s = run({ type: 'openUnit', unitKey: 'grid' }, { type: 'finishUnit', practice: true });
    expect(courseProgress(s).completedUnits).toEqual({ grid: true });
    expect(s.screen).toEqual({ name: 'quiz', lessonKey: 'topic:grid' });
  });

  it('records a finished quiz and banks its XP in the active course', () => {
    const s = run(
      { type: 'startQuiz', lessonKey: 'bug' },
      { type: 'completeQuiz', lessonKey: 'bug', xp: 25 },
      { type: 'completeQuiz', lessonKey: 'mixed', xp: 10 },
    );
    expect(s.courses.css).toEqual({ completedUnits: {}, completedSets: { bug: true, mixed: true }, xp: 35 });
  });

  it('keeps courses separate', () => {
    const rust: CourseProgress = { completedUnits: { ownership: true }, completedSets: { mixed: true }, xp: 50 };
    const s = appReducer({ ...inCss, courses: { rust } }, { type: 'completeQuiz', lessonKey: 'mixed', xp: 10 });
    expect(s.courses.rust).toBe(rust);
    expect(s.courses.css).toEqual({ completedUnits: {}, completedSets: { mixed: true }, xp: 10 });
  });

  it('selecting a course goes Home on the Learn tab', () => {
    const s = [{ type: 'selectTab', tab: 'practice' } as Action, { type: 'selectCourse', course: 'css' } as Action].reduce(
      appReducer,
      initialState,
    );
    expect(s).toMatchObject({ course: 'css', screen: { name: 'home' }, tab: 'learn' });
  });

  it('ignores a course this build does not ship', () => {
    expect(appReducer(initialState, { type: 'selectCourse', course: 'go' as CourseId })).toBe(initialState);
  });

  it('opens the picker and keeps the active course', () => {
    expect(run({ type: 'openCourses' })).toMatchObject({ course: 'css', screen: { name: 'courses' } });
  });

  it('ignores course-bound actions before a course is picked', () => {
    expect(appReducer(initialState, { type: 'openUnit', unitKey: 'basics' })).toBe(initialState);
    expect(appReducer(initialState, { type: 'completeQuiz', lessonKey: 'mixed', xp: 10 })).toBe(initialState);
  });
});

describe('stateFromProgress', () => {
  const css: CourseProgress = { completedUnits: { grid: true }, completedSets: {}, xp: 40 };

  it('opens Home in the stored course', () => {
    const s = stateFromProgress({ activeCourse: 'css', courses: { css } });
    expect(s).toMatchObject({ course: 'css', screen: { name: 'home' }, courses: { css } });
    expect(progressFromState(s)).toEqual({ activeCourse: 'css', courses: { css } });
  });

  it('opens the picker when no course, or one this build does not ship, is stored', () => {
    for (const activeCourse of [null, 'go' as CourseId]) {
      expect(stateFromProgress({ activeCourse, courses: { css } })).toMatchObject({
        course: null,
        screen: { name: 'courses' },
        courses: { css },
      });
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/state/app.test.ts`
Expected: FAIL: `courseProgress` and `stateFromProgress` are not exported.

- [ ] **Step 3: Rewrite `src/state/app.ts`**

```ts
// App navigation + progress state. Pure reducer; App hydrates it from and saves it to a ProgressStore.
import { courseById, findCourse, unitByKey, type Course, type CourseId, type LessonKey } from '../content';
import { initialSelection } from '../lib/demo';
import { emptyCourseProgress, type CourseProgress, type Progress } from '../storage/progress';

export type Tab = 'learn' | 'practice';

export type Screen =
  | { name: 'courses' }
  | { name: 'home' }
  | { name: 'learn'; unitKey: string; card: number; selection: number[] }
  | { name: 'quiz'; lessonKey: LessonKey };

export interface AppState {
  screen: Screen;
  tab: Tab;
  /** The active course; null until the learner picks one. Always a course this build ships. */
  course: CourseId | null;
  /** Finished units, finished practice runs and banked XP, per course. */
  courses: Partial<Record<CourseId, CourseProgress>>;
}

export type Action =
  | { type: 'openCourses' }
  | { type: 'selectCourse'; course: CourseId }
  | { type: 'selectTab'; tab: Tab }
  | { type: 'openUnit'; unitKey: string }
  | { type: 'gotoCard'; card: number }
  | { type: 'pickOption'; control: number; option: number }
  | { type: 'finishUnit'; practice: boolean }
  | { type: 'startQuiz'; lessonKey: LessonKey }
  | { type: 'completeQuiz'; lessonKey: LessonKey; xp: number }
  | { type: 'goHome' };

export const initialState: AppState = {
  screen: { name: 'courses' },
  tab: 'learn',
  course: null,
  courses: {},
};

/** Hydrate from storage. A stored course this build doesn't ship falls back to the picker. */
export function stateFromProgress(p: Progress): AppState {
  const course = findCourse(p.activeCourse)?.id ?? null;
  return { ...initialState, course, courses: p.courses, screen: course ? { name: 'home' } : { name: 'courses' } };
}

export function progressFromState(s: AppState): Progress {
  return { activeCourse: s.course, courses: s.courses };
}

/** A course's progress (the active course by default); empty when there is none yet. */
export function courseProgress(s: AppState, id: CourseId | null = s.course): CourseProgress {
  return (id && s.courses[id]) || emptyCourseProgress();
}

function updateCourse(s: AppState, change: (p: CourseProgress) => CourseProgress): AppState {
  if (!s.course) return s;
  return { ...s, courses: { ...s.courses, [s.course]: change(courseProgress(s)) } };
}

function cardScreen(course: Course, unitKey: string, card: number): Screen | null {
  const unit = unitByKey(course, unitKey);
  const c = unit?.cards[card];
  if (!c) return null;
  return { name: 'learn', unitKey, card, selection: initialSelection(c.demo) };
}

export function appReducer(state: AppState, action: Action): AppState {
  const { screen } = state;
  const course = state.course ? courseById(state.course) : null;
  switch (action.type) {
    case 'openCourses':
      return { ...state, screen: { name: 'courses' } };

    case 'selectCourse':
      if (!findCourse(action.course)) return state;
      return { ...state, course: action.course, screen: { name: 'home' }, tab: 'learn' };

    case 'selectTab':
      return { ...state, tab: action.tab };

    case 'openUnit': {
      const next = course && cardScreen(course, action.unitKey, 0);
      return next ? { ...state, screen: next } : state;
    }

    case 'gotoCard': {
      if (screen.name !== 'learn' || !course) return state;
      const next = cardScreen(course, screen.unitKey, action.card);
      return next ? { ...state, screen: next } : state;
    }

    case 'pickOption': {
      if (screen.name !== 'learn') return state;
      const selection = [...screen.selection];
      selection[action.control] = action.option;
      return { ...state, screen: { ...screen, selection } };
    }

    case 'finishUnit': {
      if (screen.name !== 'learn') return state;
      const done = updateCourse(state, (p) => ({ ...p, completedUnits: { ...p.completedUnits, [screen.unitKey]: true } }));
      const next: Screen = action.practice ? { name: 'quiz', lessonKey: `topic:${screen.unitKey}` } : { name: 'home' };
      return { ...done, screen: next, tab: action.practice ? state.tab : 'learn' };
    }

    case 'startQuiz':
      return { ...state, screen: { name: 'quiz', lessonKey: action.lessonKey } };

    case 'completeQuiz':
      return updateCourse(state, (p) => ({
        ...p,
        completedSets: { ...p.completedSets, [action.lessonKey]: true },
        xp: p.xp + action.xp,
      }));

    case 'goHome':
      return { ...state, screen: { name: 'home' } };
  }
}
```

- [ ] **Step 4: Run the reducer tests**

Run: `npx vitest run src/state/app.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Add icons**

Append to `src/components/icons.tsx`:
```tsx
export function ChevronLeftIcon({ size = 22, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2.5} {...rest}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 16, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2.5} {...rest}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

/** Curly braces. */
export function CssIcon({ size = 24, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2} {...rest}>
      <path d="M8 4c-2 0-3 1-3 3v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3" />
    </Svg>
  );
}

/** A cog, after Rust's gear logo. */
export function RustIcon({ size = 24, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2} {...rest}>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </Svg>
  );
}

/** The icon a course names in courses.json. */
export function CourseIcon({ name, ...rest }: IconProps & { name: CourseIconName }) {
  return name === 'rust' ? <RustIcon {...rest} /> : <CssIcon {...rest} />;
}
```
and add `import type { CourseIconName } from '../content';` below the existing import.

- [ ] **Step 6: Add the course picker screen**

Create `src/screens/Courses.tsx`:
```tsx
import { useEffect, useRef, type Dispatch } from 'react';
import { courses } from '../content';
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, CourseIcon } from '../components/icons';
import { courseProgress, type Action, type AppState } from '../state/app';
import styles from './Courses.module.css';

export function Courses({ state, dispatch }: { state: AppState; dispatch: Dispatch<Action> }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        {state.course && (
          <button type="button" className={styles.back} aria-label="Back" onClick={() => dispatch({ type: 'goHome' })}>
            <ChevronLeftIcon />
          </button>
        )}
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
          Choose a course
        </h1>
      </header>
      <ul className={styles.list}>
        {courses.map((c) => {
          const p = courseProgress(state, c.id);
          const done = c.units.filter((u) => p.completedUnits[u.key]).length;
          const current = c.id === state.course;
          return (
            <li key={c.id}>
              <button
                type="button"
                className={styles.course}
                aria-current={current ? 'true' : undefined}
                aria-label={`${c.name}, ${done} of ${c.units.length} units, ${p.xp} XP${current ? ', current' : ''}`}
                onClick={() => dispatch({ type: 'selectCourse', course: c.id })}
              >
                <span className={styles.icon}>
                  <CourseIcon name={c.icon} size={28} />
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{c.name}</span>
                  <span className={styles.blurb}>{c.blurb}</span>
                  <span className={styles.meta}>
                    {done} / {c.units.length} units · {p.xp} XP
                  </span>
                </span>
                {current ? (
                  <span className={styles.current}>
                    <CheckCircleIcon size={20} />
                    Current
                  </span>
                ) : (
                  <ChevronRightIcon className={styles.chevron} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```
Create `src/screens/Courses.module.css`:
```css
.screen {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow-y: auto;
  padding: 16px var(--screen-pad) 24px;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
}

.back {
  width: var(--touch);
  height: var(--touch);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: transparent;
  border: 0;
  border-radius: var(--radius-chip);
  color: var(--ink-muted);
}

.title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 26px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.course {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 88px;
  padding: 14px;
  background: var(--surface);
  border: 2px solid var(--line);
  border-bottom-width: 5px;
  border-radius: var(--radius-tile);
  text-align: left;
  color: var(--ink);
}

.course[aria-current='true'] {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: var(--radius-chip);
  background: var(--primary);
  color: #fff;
}

.text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-grow: 1;
  min-width: 0;
}

.name {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 20px;
}

.blurb,
.meta {
  font-size: 14px;
  color: var(--ink-muted);
}

.meta {
  font-weight: 700;
}

.current {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
}

.chevron {
  flex-shrink: 0;
  color: var(--ink-faint);
}
```

- [ ] **Step 7: Wire App and the Home header**

Replace the body of `App` in `src/App.tsx` with:
```tsx
import { useEffect, useReducer } from 'react';
import { courseById } from './content';
import { Quiz } from './quiz/Quiz';
import { Courses } from './screens/Courses';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { appReducer, stateFromProgress } from './state/app';
import { localProgressStore, type ProgressStore } from './storage/progress';
import styles from './App.module.css';

const defaultStore = localProgressStore();

export function App({ store = defaultStore }: { store?: ProgressStore }) {
  const [state, dispatch] = useReducer(appReducer, store, (s) => stateFromProgress(s.load()));
  const { screen, course: activeCourse, courses: progress } = state;
  const course = activeCourse ? courseById(activeCourse) : null;

  // Save on progress changes only, not on every navigation.
  useEffect(() => {
    store.save({ activeCourse, courses: progress });
  }, [store, activeCourse, progress]);

  return (
    <div className={styles.frame}>
      {(screen.name === 'courses' || !course) && <Courses state={state} dispatch={dispatch} />}
      {course && screen.name === 'home' && <Home course={course} state={state} dispatch={dispatch} />}
      {course && screen.name === 'learn' && (
        <Learn
          key={`${course.id}:${screen.unitKey}`}
          course={course}
          unitKey={screen.unitKey}
          card={screen.card}
          selection={screen.selection}
          dispatch={dispatch}
        />
      )}
      {course && screen.name === 'quiz' && (
        <Quiz
          key={`${course.id}:${screen.lessonKey}`}
          courseId={course.id}
          lessonKey={screen.lessonKey}
          onExit={() => dispatch({ type: 'goHome' })}
          onComplete={({ lessonKey, xp }) => dispatch({ type: 'completeQuiz', lessonKey, xp })}
        />
      )}
    </div>
  );
}
```
`progressFromState` stays exported for the reducer tests.

In `src/screens/Home.tsx`:
- Imports: add `CourseIcon, ChevronDownIcon` to the icons import, and `import { courseProgress } from '../state/app';` (merge with the existing `../state/app` type import) and `import { totalXp } from '../storage/progress';`.
- Replace the `<header>` block with:
  ```tsx
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.wordmark}>Cascade</span>
            <span className={styles.tagline}>{course.tagline}</span>
          </div>
          <button
            type="button"
            className={styles.courseChip}
            aria-label={`${course.name}, change course`}
            onClick={() => dispatch({ type: 'openCourses' })}
          >
            <CourseIcon name={course.icon} size={18} />
            {course.name}
            <ChevronDownIcon size={14} />
          </button>
          <div className={styles.stats}>
            <p className={styles.xp}>{totalXp(state)} XP</p>
            <HeartCount count={HEARTS_PER_LESSON} />
          </div>
        </header>
  ```
- In `LearnTab`, `const done = state.completedUnits;` becomes `const done = courseProgress(state).completedUnits;`. In `PracticeTab`, `const done = state.completedSets;` becomes `const done = courseProgress(state).completedSets;`.

Append to `src/screens/Home.module.css`:
```css
.header {
  gap: 8px;
}

.courseChip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: var(--touch);
  padding: 0 12px;
  border: 2px solid var(--line);
  border-bottom-width: 4px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
}
```

- [ ] **Step 8: Update the App tests**

In `src/App.test.tsx`:
- Add `beforeEach` to the vitest import.
- Below the `heading` helper, add:
  ```tsx
  const startIn = (course: string, courses = {}) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeCourse: course, courses }));
  ```
- Add `beforeEach(() => startIn('css'));` as the first line inside `describe('Home', …)` and inside `describe('Learn flow', …)`.
- In `describe('Persistence', …)`, add `startIn('css');` as the first line of the `saves progress when a unit is finished` test.
- In `starts fresh when stored progress is corrupt`, corrupt v2 now means "no course picked", so the picker shows. Replace its two assertions with:
  ```tsx
    expect(heading()).toHaveTextContent('Choose a course');
  ```
- Append:
  ```tsx
  describe('Course picker', () => {
    it('opens on first launch and starts the chosen course', async () => {
      const user = userEvent.setup();
      render(<App />);
      expect(heading()).toHaveTextContent('Choose a course');
      expect(heading()).toHaveFocus();
      expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /^CSS, 0 of 5 units, 0 XP$/ }));
      expect(heading()).toHaveTextContent('How CSS works');
      expect(screen.getByText('CSS, one tap at a time')).toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ activeCourse: 'css' });
    });

    it('switches course from the header chip and marks the current one with text', async () => {
      const user = userEvent.setup();
      startIn('css', { css: { completedUnits: { basics: true }, completedSets: {}, xp: 40 } });
      render(<App />);
      expect(screen.getByText('40 XP')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'CSS, change course' }));
      expect(heading()).toHaveTextContent('Choose a course');
      const current = screen.getByRole('button', { name: 'CSS, 1 of 5 units, 40 XP, current' });
      expect(current).toHaveAttribute('aria-current', 'true');
      expect(current).toHaveTextContent('Current');
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(heading()).toHaveTextContent('How CSS works');
    });

    it('falls back to the picker when the stored course is not in this build', () => {
      startIn('go');
      render(<App />);
      expect(heading()).toHaveTextContent('Choose a course');
    });
  });
  ```

- [ ] **Step 9: Update the e2e tests and add the migration test**

In `e2e/smoke.spec.ts`, after the `toHaveTitle` line, add:
```ts
  await page.getByRole('button', { name: /^CSS,/ }).click();
```
In `e2e/double-tap.spec.ts`, add the same line after each `await page.goto('/');`.

Create `e2e/migration.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('v1 progress lands in CSS with its XP and no picker', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'cascade.progress.v1',
      JSON.stringify({ completedUnits: { grid: true }, completedSets: {}, totalXp: 40 }),
    );
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'CSS, change course' })).toBeVisible();
  await expect(page.getByText('40 XP')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grid basics, 4 cards, completed' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Choose a course' })).toHaveCount(0);
});
```

- [ ] **Step 10: Run everything**

Run: `npm run typecheck && npm test && npx playwright test`
Expected: all PASS, including 3 e2e files.

- [ ] **Step 11: Look at it**

Run `npm run dev`, open http://localhost:5173 at 390×844 (browser devtools device mode), and check:
- The picker shows on a fresh profile.
- The Home header fits on one row: wordmark, chip, XP, hearts.
- The chip is at least 44px tall.
- The current course shows the check icon plus "Current".

Fix spacing in the CSS if the header wraps.

- [ ] **Step 12: Commit**

```bash
git add src e2e
git commit -m "Add course picker, per-course app state and a course chip on Home

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---

### Task 7: Rust code display: helpers, highlighter, code panel and output panel

**Files:**
- Create: `src/lib/rustCode.ts`, `src/lib/rustCode.test.ts`, `src/lib/highlightRust.ts`, `src/lib/highlightRust.test.ts`, `src/components/OutputPanel.tsx`, `src/components/OutputPanel.module.css`, `src/components/CodePanel.test.tsx`, `src/components/OutputPanel.test.tsx`
- Modify: `src/components/CodePanel.tsx`, `src/components/CodePanel.module.css`, `src/styles/tokens.css`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `rustCode.ts` (**no imports**: Node runs it directly from `scripts/`): `isHiddenLine(line)`, `visibleLines(code): string[]`, `programSource(code): string`, `visibleLineNumber(code, programLine): number | null`, `BLANK = '___'`, `fillBlank(code, value): string[]`, `normalizeToken(input): string`, `TOKEN_MAX_LENGTH = 40`, `type BuildSegment = string | { slot: number }`, `type BuildLine = string | BuildSegment[]`, `fillSlots(code: readonly BuildLine[], words: readonly (string | null)[]): string[]`, `parseDiff(diff): { remove: string[]; add: string[] }`, `applyDiff(code, diff): string[] | null`.
  - `highlightRust(line): RustToken[]`, `type RustTokenKind`.
  - `CodePanel({ lines, label?, lang?: CodeLang, id? })`, `CodeTokens({ line, lang? })`, `type CodeLang = 'css' | 'rust'`.
  - `OutputPanel({ output?, error? })`: region "Output" or region "Compiler error".

- [ ] **Step 1: Write the failing tests**

Create `src/lib/rustCode.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  applyDiff,
  fillBlank,
  fillSlots,
  normalizeToken,
  parseDiff,
  programSource,
  visibleLineNumber,
  visibleLines,
} from './rustCode';

const code = ['# fn main() {', 'let a = 1;', '#', 'let b = a;', '# }'];

describe('hidden lines', () => {
  it('hides `# ` lines and a lone `#` from display', () => {
    expect(visibleLines(code)).toEqual(['let a = 1;', 'let b = a;']);
  });

  it('un-hides them for the compiler', () => {
    expect(programSource(code)).toBe('fn main() {\nlet a = 1;\n\nlet b = a;\n}\n');
  });

  it('maps program lines to visible line numbers', () => {
    expect(visibleLineNumber(code, 2)).toBe(1);
    expect(visibleLineNumber(code, 4)).toBe(2);
    expect(visibleLineNumber(code, 1)).toBeNull();
    expect(visibleLineNumber(code, 3)).toBeNull();
    expect(visibleLineNumber(code, 9)).toBeNull();
  });

  it('does not treat attributes as hidden', () => {
    expect(visibleLines(['#[derive(Debug)]', 'struct P;'])).toEqual(['#[derive(Debug)]', 'struct P;']);
  });
});

describe('blanks and slots', () => {
  it('fills the ___ blank', () => {
    expect(fillBlank(['fn f(v: ___ Vec<i32>) {}', 'x'], '&mut')).toEqual(['fn f(v: &mut Vec<i32>) {}', 'x']);
  });

  it('normalizes typed tokens without changing case', () => {
    expect(normalizeToken('  & \t mut ')).toBe('& mut');
    expect(normalizeToken('&MUT')).toBe('&MUT');
  });

  it('fills inline slots, leaving empty ones blank', () => {
    const lines = [['fn f(s: ', { slot: 0 }, ') {}'], 'x', ['g(', { slot: 1 }, ');']];
    expect(fillSlots(lines, ['&str', null])).toEqual(['fn f(s: &str) {}', 'x', 'g();']);
  });
});

describe('diffs', () => {
  it('splits removed and added lines, keeping indentation', () => {
    expect(parseDiff(['-     let t = s;', '+     let t = s.clone();'])).toEqual({
      remove: ['    let t = s;'],
      add: ['    let t = s.clone();'],
    });
  });

  it('replaces a contiguous run of removed lines', () => {
    expect(applyDiff(['a', 'b', 'c'], ['- b', '+ x', '+ y'])).toEqual(['a', 'x', 'y', 'c']);
    expect(applyDiff(['a', 'b', 'c'], ['- b', '- c'])).toEqual(['a']);
  });

  it('returns null when the diff does not apply', () => {
    expect(applyDiff(['a', 'b', 'c'], ['- a', '- c'])).toBeNull();
    expect(applyDiff(['a'], ['- z', '+ y'])).toBeNull();
    expect(applyDiff(['a'], ['+ z'])).toBeNull();
  });
});
```
Create `src/lib/highlightRust.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { highlightRust } from './highlightRust';

const kinds = (line: string) => highlightRust(line).map((t) => `${t.kind}:${t.text}`);

describe('highlightRust', () => {
  it('colors a let binding', () => {
    expect(kinds('let s = String::from("hi");')).toEqual([
      'keyword:let',
      'plain: s ',
      'punct:=',
      'plain: ',
      'type:String',
      'punct:::',
      'plain:from',
      'punct:(',
      'string:"hi"',
      'punct:);',
    ]);
  });

  it('tells lifetimes, primitives, keywords and comments apart', () => {
    expect(kinds("fn f<'a>(x: &'a mut Vec<i32>) -> usize { // note")).toEqual([
      'keyword:fn',
      'plain: f',
      'punct:<',
      "lifetime:'a",
      'punct:>(',
      'plain:x',
      'punct::',
      'plain: ',
      'punct:&',
      "lifetime:'a",
      'plain: ',
      'keyword:mut',
      'plain: ',
      'type:Vec',
      'punct:<',
      'type:i32',
      'punct:>)',
      'plain: ',
      'punct:->',
      'plain: ',
      'type:usize',
      'plain: ',
      'punct:{',
      'plain: ',
      'comment:// note',
    ]);
  });

  it('colors macros, numbers and chars, but not `!=`', () => {
    expect(kinds("println!(\"{}\", 1_000u32 + 'x' as u32);")).toEqual([
      'macro:println!',
      'punct:(',
      'string:"{}"',
      'punct:,',
      'plain: ',
      'number:1_000u32',
      'plain: ',
      'punct:+',
      'plain: ',
      "string:'x'",
      'plain: ',
      'keyword:as',
      'plain: ',
      'type:u32',
      'punct:);',
    ]);
    expect(kinds('x!=y')).toEqual(['plain:x', 'punct:!=', 'plain:y']);
  });

  it('keeps an unterminated string on one token', () => {
    expect(kinds('"abc')).toEqual(['string:"abc']);
  });
});
```
Create `src/components/CodePanel.test.tsx`:
```tsx
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodePanel } from './CodePanel';

describe('CodePanel', () => {
  it('keeps CSS panels unnumbered', () => {
    render(<CodePanel lines={['.a { color: red; }']} label="CSS" />);
    expect(screen.getByLabelText('CSS').querySelector('.gutter')).toBeNull();
  });

  it('hides hidden Rust lines and numbers the visible ones', () => {
    render(<CodePanel lines={['# fn main() {', 'let a = 1;', 'let b = a;', '# }']} lang="rust" label="Rust code" />);
    const panel = screen.getByLabelText('Rust code');
    expect(panel.textContent).not.toContain('fn main');
    const gutters = [...panel.querySelectorAll('.gutter')];
    expect(gutters.map((g) => g.textContent)).toEqual(['1', '2']);
    expect(gutters[0]).toHaveAttribute('aria-hidden', 'true');
    expect(within(panel).getAllByText('let')[0]).toHaveClass('keyword');
  });
});
```
Create `src/components/OutputPanel.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OutputPanel } from './OutputPanel';

describe('OutputPanel', () => {
  it('shows program output', () => {
    render(<OutputPanel output={['hi', 'there']} />);
    expect(screen.getByRole('region', { name: 'Output' }).querySelector('pre')?.textContent).toBe('hi\nthere');
  });

  it('shows a compile error with an icon and words, not just color', () => {
    render(<OutputPanel error="error[E0382]: borrow of moved value: `s`" />);
    const region = screen.getByRole('region', { name: 'Compiler error' });
    expect(region).toHaveTextContent('Doesn’t compile');
    expect(region).toHaveTextContent('error[E0382]: borrow of moved value: `s`');
    expect(region.querySelector('svg')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/rustCode.test.ts src/lib/highlightRust.test.ts src/components`
Expected: FAIL: modules not found, and no `.gutter` in the Rust panel.

- [ ] **Step 3: Implement `src/lib/rustCode.ts`**

```ts
// Rust snippet helpers shared by the app and scripts/check-rust.ts.
// Keep this file free of imports: Node runs it directly (type stripping) for the checker.

/** rustdoc's hidden-line convention: a `# ` prefix or a lone `#`. Compiled, never shown. */
export function isHiddenLine(line: string): boolean {
  return line === '#' || line.startsWith('# ');
}

/** Lines as displayed. Line numbers in content (e.g. rs-error answers) count these. */
export function visibleLines(code: readonly string[]): string[] {
  return code.filter((l) => !isHiddenLine(l));
}

/** The program rustc compiles: hidden lines un-hidden. */
export function programSource(code: readonly string[]): string {
  return code.map((l) => (l === '#' ? '' : isHiddenLine(l) ? l.slice(2) : l)).join('\n') + '\n';
}

/** 1-based program line → 1-based visible line; null for a hidden or missing line. */
export function visibleLineNumber(code: readonly string[], programLine: number): number | null {
  const line = code[programLine - 1];
  if (line === undefined || isHiddenLine(line)) return null;
  return visibleLines(code.slice(0, programLine)).length;
}

/** The rs-type blank. */
export const BLANK = '___';

export function fillBlank(code: readonly string[], value: string): string[] {
  return code.map((l) => l.replace(BLANK, value));
}

/** rs-type input limit, enforced by the input and the session. */
export const TOKEN_MAX_LENGTH = 40;

/** rs-type grading: trim and collapse inner whitespace. Case is kept: Rust is case-sensitive. */
export function normalizeToken(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export type BuildSegment = string | { slot: number };
/** A plain line, or text segments with inline slots. */
export type BuildLine = string | BuildSegment[];

/** rs-build code with each slot replaced by its word ('' while empty). */
export function fillSlots(code: readonly BuildLine[], words: readonly (string | null)[]): string[] {
  return code.map((line) =>
    typeof line === 'string' ? line : line.map((seg) => (typeof seg === 'string' ? seg : (words[seg.slot] ?? ''))).join(''),
  );
}

/** rs-fix diff lines (`- old` / `+ new`) with their prefixes stripped. */
export function parseDiff(diff: readonly string[]): { remove: string[]; add: string[] } {
  return {
    remove: diff.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)),
    add: diff.filter((l) => l.startsWith('+ ')).map((l) => l.slice(2)),
  };
}

/** Replace the run of removed lines with the added ones. Null if nothing is removed or the run isn't in `code`. */
export function applyDiff(code: readonly string[], diff: readonly string[]): string[] | null {
  const { remove, add } = parseDiff(diff);
  if (!remove.length) return null;
  for (let i = 0; i + remove.length <= code.length; i++) {
    if (remove.every((line, j) => code[i + j] === line)) {
      return [...code.slice(0, i), ...add, ...code.slice(i + remove.length)];
    }
  }
  return null;
}
```

- [ ] **Step 4: Implement `src/lib/highlightRust.ts`**

```ts
// Rust syntax colors for short teaching snippets. One line at a time with no
// state between lines, so a block comment spanning lines renders as plain text.
export type RustTokenKind = 'keyword' | 'type' | 'string' | 'number' | 'comment' | 'lifetime' | 'macro' | 'punct' | 'plain';

export interface RustToken {
  text: string;
  kind: RustTokenKind;
}

const KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum', 'extern', 'false', 'fn', 'for',
  'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static',
  'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while',
]);

const PRIMITIVES = new Set([
  'i8', 'i16', 'i32', 'i64', 'i128', 'isize', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize', 'f32', 'f64', 'bool', 'char', 'str',
]);

// First match wins at each position.
const RULES: [RegExp, RustTokenKind | 'ident'][] = [
  [/^\/\/.*/, 'comment'],
  [/^"(?:\\.|[^"\\])*"?/, 'string'],
  [/^'(?:\\.|[^'\\])'/, 'string'], // char literal
  [/^'[A-Za-z_]\w*/, 'lifetime'],
  [/^\d[\d_]*(?:\.\d[\d_]*)?(?:[iuf](?:8|16|32|64|128|size))?/, 'number'],
  [/^[A-Za-z_]\w*(?:!(?!=))?/, 'ident'],
  [/^\s+/, 'plain'],
  [/^[\s\S]/, 'punct'],
];

function identKind(word: string): RustTokenKind {
  if (word.endsWith('!')) return 'macro';
  if (KEYWORDS.has(word)) return 'keyword';
  if (PRIMITIVES.has(word) || /^[A-Z]/.test(word)) return 'type';
  return 'plain';
}

export function highlightRust(line: string): RustToken[] {
  const tokens: RustToken[] = [];
  let rest = line;
  while (rest) {
    for (const [re, rule] of RULES) {
      const m = re.exec(rest);
      if (!m) continue;
      const text = m[0];
      const kind = rule === 'ident' ? identKind(text) : rule;
      const last = tokens[tokens.length - 1];
      if (last && last.kind === kind) last.text += text;
      else tokens.push({ text, kind });
      rest = rest.slice(text.length);
      break;
    }
  }
  return tokens;
}
```
The formatter may put each `KEYWORDS`/`PRIMITIVES` entry on its own line. That's fine.

- [ ] **Step 5: Teach `CodePanel` about Rust**

Replace `src/components/CodePanel.tsx` with:
```tsx
import { highlightLine } from '../lib/highlight';
import { highlightRust } from '../lib/highlightRust';
import { visibleLines } from '../lib/rustCode';
import styles from './CodePanel.module.css';

export type CodeLang = 'css' | 'rust';

/** One syntax-colored line (no wrapper). In CSS, `§` lines are HTML. */
export function CodeTokens({ line, lang = 'css' }: { line: string; lang?: CodeLang }) {
  const tokens = lang === 'rust' ? highlightRust(line) : highlightLine(line);
  return (
    <>
      {tokens.map((t, j) => (
        <span key={j} className={styles[t.kind]}>
          {t.text}
        </span>
      ))}
    </>
  );
}

/** Dark editor panel with syntax colors. Rust panels hide `# ` lines and number the rest. */
export function CodePanel({ lines, label, lang = 'css', id }: { lines: readonly string[]; label?: string; lang?: CodeLang; id?: string }) {
  const rust = lang === 'rust';
  const shown = rust ? visibleLines(lines) : lines;
  return (
    <pre id={id} className={styles.panel} aria-label={label}>
      <code>
        {shown.map((line, i) => (
          <span key={i} className={styles.line}>
            {rust && (
              <span className={styles.gutter} aria-hidden="true">
                {i + 1}
              </span>
            )}
            <CodeTokens line={line} lang={lang} />
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  );
}
```
Append to `src/components/CodePanel.module.css`:
```css
.gutter {
  display: inline-block;
  width: 2.5ch;
  margin-right: 1.5ch;
  text-align: right;
  color: var(--ink-faint);
  user-select: none;
}

.keyword {
  color: var(--code-keyword);
}
.type {
  color: var(--code-type);
}
.string {
  color: var(--code-string);
}
.number {
  color: var(--code-number);
}
.comment {
  color: var(--code-comment);
  font-style: italic;
}
.lifetime {
  color: var(--code-lifetime);
}
.macro {
  color: var(--code-macro);
}
.plain {
  color: var(--code-punct);
}
```
In `src/styles/tokens.css`, below `--code-html`, add. Each color's contrast on `--ink` (#1d1b26) is in its comment, and all are ≥ 4.5:1:
```css
  --code-keyword: #f9a8d4; /* 9.4:1 */
  --code-type: #7dd3fc; /* 10.2:1 */
  --code-string: #86efac; /* 12.1:1 */
  --code-number: #fcd34d; /* 11.8:1 */
  --code-comment: #9c98b3; /* 6.1:1 */
  --code-lifetime: #fdba74; /* 10.1:1 */
  --code-macro: #c4b5fd; /* 9.2:1 */
  --code-add: #86efac; /* 12.1:1 */
  --code-del: #fca5a5; /* 8.9:1 */
```

- [ ] **Step 6: Add `OutputPanel`**

Create `src/components/OutputPanel.tsx`:
```tsx
import { XCircleIcon } from './icons';
import styles from './OutputPanel.module.css';

/** What a Rust program does: its stdout, or the compile error (icon + words, never color alone). */
export function OutputPanel({ output, error }: { output?: readonly string[]; error?: string }) {
  if (error !== undefined) {
    return (
      <section className={`${styles.panel} ${styles.error}`} aria-label="Compiler error">
        <p className={styles.title}>
          <XCircleIcon size={18} />
          Doesn’t compile
        </p>
        <pre className={styles.body}>{error}</pre>
      </section>
    );
  }
  return (
    <section className={styles.panel} aria-label="Output">
      <p className={styles.title}>Output</p>
      <pre className={styles.body}>{(output ?? []).join('\n')}</pre>
    </section>
  );
}
```
Create `src/components/OutputPanel.module.css`:
```css
.panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  background: var(--surface);
  border: 2px solid var(--line);
  border-radius: var(--radius-tile);
}

.error {
  background: var(--wrong-bg);
  border-color: var(--wrong);
}

.title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.error .title {
  color: var(--wrong-edge);
}

.body {
  margin: 0;
  font-family: var(--font-code);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--ink);
}
```

- [ ] **Step 7: Run the tests**

Run: `npm run typecheck && npm test`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib src/components src/styles/tokens.css
git commit -m "Add Rust code helpers, syntax highlighting and an output panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---

### Task 8: Rust demos in Learn cards

**Files:**
- Create: `src/content/guards.ts`, `src/content/validateRust.ts`, `src/content/validateRust.test.ts`, `src/screens/Learn.test.tsx`
- Modify: `src/content/types.ts`, `src/content/index.ts`, `src/content/validate.ts`, `src/content/validateCss.ts`, `src/content/content.test.ts`, `src/lib/demo.ts`, `src/lib/lib.test.ts`, `src/screens/Learn.tsx`

**Interfaces:**
- Consumes: `CodePanel` with `lang`, `OutputPanel`, `visibleLines` (Task 7).
- Produces:
  - types: `CodeDemo`, `RustChoiceOption`, `RustChoiceDemo`, `CssDemo = KnobDemo | ChoiceDemo`, `RustDemo = CodeDemo | RustChoiceDemo`, `Demo = CssDemo | RustDemo`.
  - `guards.ts`: `isRustDemo(d: Demo): d is RustDemo` (re-exported from `src/content`).
  - `validateRust.ts`: `isRustError(v): v is string`, `BAD_ERROR` message, `validateRustDemo(d, at, err)`.
  - `demo.ts`: `buildDemo(demo: CssDemo, selection)`, `RustDemoView { code; output?; error?; controls; caption }`, `buildRustDemo(demo: RustDemo, selection): RustDemoView`; `initialSelection` handles all four kinds.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/lib.test.ts` (and add `buildRustDemo` to the `./demo` import and `type RustChoiceDemo` to the content import):
```ts
describe('buildRustDemo', () => {
  const choice: RustChoiceDemo = {
    kind: 'rs-choice',
    label: 'let t = …',
    opts: [
      { label: 's', code: ['let t = s;'], error: 'error[E0382]: borrow of moved value: `s`', note: 'Moved.' },
      { label: 's.clone()', code: ['let t = s.clone();'], output: ['hi hi'] },
    ],
  };

  it('starts rs-choice at its start option and code demos with no controls', () => {
    expect(initialSelection(choice)).toEqual([0]);
    expect(initialSelection({ ...choice, start: 1 })).toEqual([1]);
    expect(initialSelection({ kind: 'code', code: ['fn main() {}'] })).toEqual([]);
  });

  it('shows the picked option’s code, result and note', () => {
    expect(buildRustDemo(choice, [0])).toEqual({
      code: ['let t = s;'],
      error: 'error[E0382]: borrow of moved value: `s`',
      output: undefined,
      controls: [{ label: 'let t = …', options: [{ label: 's', active: true }, { label: 's.clone()', active: false }] }],
      caption: 'Moved.',
    });
    expect(buildRustDemo(choice, [1])).toMatchObject({ output: ['hi hi'], error: undefined, caption: null });
  });

  it('passes a code demo through', () => {
    expect(buildRustDemo({ kind: 'code', code: ['fn main() {}'], output: [''] }, [])).toEqual({
      code: ['fn main() {}'],
      output: [''],
      error: undefined,
      controls: [],
      caption: null,
    });
  });
});
```
Create `src/content/validateRust.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { RustDemo } from './types';
import { validateRustDemo } from './validateRust';

const check = (d: unknown) => {
  const errors: string[] = [];
  validateRustDemo(d as RustDemo, 'd', (where, msg) => errors.push(`${where}: ${msg}`));
  return errors;
};

describe('validateRustDemo', () => {
  it('accepts code and rs-choice demos', () => {
    expect(check({ kind: 'code', code: ['fn main() {}'] })).toEqual([]);
    expect(check({ kind: 'code', code: ['fn main() {}'], output: ['hi'] })).toEqual([]);
    expect(
      check({
        kind: 'rs-choice',
        label: 'x',
        opts: [
          { label: 'a', code: ['a'], output: ['1'] },
          { label: 'b', code: ['b'], error: 'error[E0382]: moved' },
        ],
      }),
    ).toEqual([]);
  });

  it('rejects bad code demos', () => {
    expect(check({ kind: 'code', code: ['# hidden only'] })).toEqual(['d: code demo needs visible code']);
    expect(check({ kind: 'code', code: ['x'], output: ['1'], error: 'error[E0382]: m' })).toEqual(['d: code demo has both output and error']);
    expect(check({ kind: 'code', code: ['x'], error: 'moved' })).toEqual(['d: error must look like "error[E0000]: message"']);
  });

  it('rejects bad rs-choice demos', () => {
    expect(check({ kind: 'rs-choice', label: 'x', opts: [{ label: 'a', code: ['a'], output: ['1'] }] })).toEqual([
      'd: rs-choice demo needs 2+ options',
    ]);
    expect(
      check({
        kind: 'rs-choice',
        label: 'x',
        start: 5,
        opts: [
          { label: 'a', code: ['a'] },
          { label: 'b', code: ['b'], output: ['1'] },
        ],
      }),
    ).toEqual(['d: rs-choice start out of range', 'd/option a: needs exactly one of output and error']);
  });
});
```
Append to the `describe('css content', …)` block in `src/content/content.test.ts`:
```ts
  it('keeps demo kinds to their course', () => {
    const broken = structuredClone(css);
    const card = { title: 'T', body: 'B', demo: { kind: 'code', code: ['fn main() {}'] } };
    (broken.units[0]!.cards as unknown[]).push(card);
    expect(validateContent(broken)).toContain('lessons/basics/card 4: demo kind "code" does not belong in the css course');
  });
```
Create `src/screens/Learn.test.tsx`:
```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { Course } from '../content';
import type { Action } from '../state/app';
import { Learn } from './Learn';

const course: Course = {
  id: 'rust',
  name: 'Rust',
  tagline: '',
  blurb: '',
  icon: 'rust',
  questions: [],
  questionTypes: [],
  topics: {},
  units: [
    {
      key: 'own',
      name: 'Ownership',
      blurb: '',
      cards: [
        {
          title: 'Moves',
          body: 'Pick one.',
          demo: {
            kind: 'rs-choice',
            label: 'let t = …',
            opts: [
              { label: 's', code: ['# fn main() {', 'let t = s;', '# }'], error: 'error[E0382]: borrow of moved value: `s`', note: 'Moved.' },
              { label: 's.clone()', code: ['let t = s.clone();'], output: ['hi hi'] },
            ],
          },
        },
        { title: 'Plain', body: 'No result.', demo: { kind: 'code', code: ['fn main() {}'] } },
      ],
    },
  ],
};

function Harness({ card = 0 }: { card?: number }) {
  const [selection, setSelection] = useState([0]);
  const dispatch = (a: Action) => {
    if (a.type === 'pickOption') setSelection([a.option]);
  };
  return <Learn course={course} unitKey="own" card={card} selection={selection} dispatch={dispatch} />;
}

describe('Learn with Rust demos', () => {
  it('shows the picked variant’s code and result, and swaps both on tap', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const code = screen.getByLabelText('Rust code');
    expect(code).toHaveTextContent('let t = s;');
    expect(code).not.toHaveTextContent('fn main');
    const error = screen.getByRole('region', { name: 'Compiler error' });
    expect(error).toHaveTextContent('Doesn’t compile');
    expect(error).toHaveTextContent('E0382');
    expect(screen.getByText('Moved.')).toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'let t = …' });
    await user.click(within(group).getByRole('button', { name: 's.clone()' }));
    expect(within(group).getByRole('button', { name: 's.clone()' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Output' })).toHaveTextContent('hi hi');
    expect(screen.queryByRole('region', { name: 'Compiler error' })).not.toBeInTheDocument();
  });

  it('omits the result panel when a code demo has neither output nor error', () => {
    render(<Harness card={1} />);
    expect(screen.getByLabelText('Rust code')).toHaveTextContent('fn main() {}');
    expect(screen.queryByRole('region', { name: 'Output' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/lib.test.ts src/content src/screens/Learn.test.tsx`
Expected: FAIL: `buildRustDemo` and `validateRustDemo` don't exist, and the `rs-choice` kind doesn't type-check.

- [ ] **Step 3: Add the demo types and guard**

In `src/content/types.ts`, replace `export type Demo = KnobDemo | ChoiceDemo;` with:
```ts
export type CssDemo = KnobDemo | ChoiceDemo;
export type RustDemo = CodeDemo | RustChoiceDemo;
export type Demo = CssDemo | RustDemo;
```
and add after the `ChoiceDemo` interface:
```ts
/** A Rust example and what it does. At most one of `output` / `error`; neither means "compiles, prints nothing". */
export interface CodeDemo {
  kind: 'code';
  code: string[];
  output?: string[];
  /** rustc's first error line, e.g. `error[E0382]: borrow of moved value: \`s\``. */
  error?: string;
}

export interface RustChoiceOption {
  label: string;
  code: string[];
  /** Exactly one of `output` / `error`. */
  output?: string[];
  error?: string;
  note?: string;
}

/** Tap between variants of a Rust snippet and see how the result changes. */
export interface RustChoiceDemo {
  kind: 'rs-choice';
  label: string;
  start?: number;
  opts: RustChoiceOption[];
}
```
Create `src/content/guards.ts`:
```ts
// Narrowing helpers for the content unions.
import type { Demo, RustDemo } from './types';

export function isRustDemo(d: Demo): d is RustDemo {
  return d.kind === 'code' || d.kind === 'rs-choice';
}
```
In `src/content/index.ts`, add `export * from './guards';` after `export * from './typeKeys';`.

- [ ] **Step 4: Build Rust demo views**

In `src/lib/demo.ts`:
- Change the import to `import type { CssDemo, Demo, LegendItem, RustDemo } from '../content/types';`.
- Replace `initialSelection` with:
  ```ts
  /** Selected option index per control: a choice's `start`, or each knob's `start` (default 0). */
  export function initialSelection(demo: Demo | undefined): number[] {
    if (!demo || demo.kind === 'code') return [];
    if (demo.kind === 'choice' || demo.kind === 'rs-choice') return [demo.start ?? 0];
    return demo.knobs.map((k) => k.start ?? 0);
  }
  ```
- Change `export function buildDemo(demo: Demo, …)` to `export function buildDemo(demo: CssDemo, …)`.
- Append:
  ```ts
  export interface RustDemoView {
    code: string[];
    output?: string[];
    error?: string;
    /** Empty for a code demo; one control for rs-choice. */
    controls: DemoControl[];
    caption: string | null;
  }

  export function buildRustDemo(demo: RustDemo, selection: readonly number[]): RustDemoView {
    if (demo.kind === 'code') {
      return { code: demo.code, output: demo.output, error: demo.error, controls: [], caption: null };
    }
    const active = selection[0] ?? 0;
    const opt = demo.opts[active] ?? demo.opts[0]!;
    return {
      code: opt.code,
      output: opt.output,
      error: opt.error,
      controls: [{ label: demo.label, options: demo.opts.map((o, i) => ({ label: o.label, active: i === active })) }],
      caption: opt.note ?? null,
    };
  }
  ```

- [ ] **Step 5: Render Rust demos in Learn**

In `src/screens/Learn.tsx`:
- Imports: add `isRustDemo` to the `../content` import, `OutputPanel` from `'../components/OutputPanel'`, and change the demo import to `import { buildDemo, buildRustDemo, type DemoControl, type DemoView, type RustDemoView } from '../lib/demo';`.
- Delete `const demo = card.demo ? buildDemo(card.demo, selection) : null;` and add in its place:
  ```tsx
  const pick = (control: number, option: number) => dispatch({ type: 'pickOption', control, option });
  ```
- Replace `{demo && <Playground … />}` with:
  ```tsx
        {card.demo &&
          (isRustDemo(card.demo) ? (
            <RustPlayground view={buildRustDemo(card.demo, selection)} onPick={pick} />
          ) : (
            <Playground view={buildDemo(card.demo, selection)} onPick={pick} />
          ))}
  ```
- In `Playground`, delete `const idBase = useId();` and replace the whole `{view.controls.map(…)}` block with `<DemoControls controls={view.controls} onPick={onPick} />`.
- Add below `Playground`:
  ```tsx
  function RustPlayground({ view, onPick }: { view: RustDemoView; onPick: (control: number, option: number) => void }) {
    return (
      <section className={styles.playground} aria-label="Playground">
        <CodePanel lines={view.code} lang="rust" label="Rust code" />
        {(view.output !== undefined || view.error !== undefined) && <OutputPanel output={view.output} error={view.error} />}
        {view.caption !== null && (
          <p className={styles.caption} aria-live="polite">
            {view.caption}
          </p>
        )}
        <DemoControls controls={view.controls} onPick={onPick} />
      </section>
    );
  }

  /** One chip group per knob (or the single choice). */
  function DemoControls({ controls, onPick }: { controls: DemoControl[]; onPick: (control: number, option: number) => void }) {
    const idBase = useId();
    return (
      <>
        {controls.map((control, ci) => {
          const labelId = `${idBase}-knob-${ci}`;
          return (
            <div key={control.label} className={styles.knob}>
              <span id={labelId} className={styles.knobLabel}>
                {control.label}
              </span>
              <div role="group" aria-labelledby={labelId} className={styles.chips}>
                {control.options.map((o, oi) => (
                  <button
                    key={o.label}
                    type="button"
                    className={styles.chip}
                    aria-pressed={o.active}
                    onClick={() => onPick(ci, oi)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </>
    );
  }
  ```

- [ ] **Step 6: Validate demos per course**

Create `src/content/validateRust.ts`:
```ts
// Checks for Rust-course demos and questions.
import type { RustDemo } from './types';
import { inRange, isStr, isStrArr, type Err } from './validateUtil';
import { visibleLines } from '../lib/rustCode';

export const isRustError = (v: unknown): v is string => isStr(v) && /^error\[E\d{4}\]: \S/.test(v);
export const BAD_ERROR = 'error must look like "error[E0000]: message"';

const hasCode = (c: unknown): c is string[] => isStrArr(c) && visibleLines(c).length > 0;

function validateResult(r: { output?: unknown; error?: unknown }, at: string, err: Err) {
  if (r.output !== undefined && !isStrArr(r.output)) err(at, 'output must be a list of strings');
  if (r.error !== undefined && !isRustError(r.error)) err(at, BAD_ERROR);
}

export function validateRustDemo(d: RustDemo, at: string, err: Err) {
  if (d.kind === 'code') {
    if (!hasCode(d.code)) err(at, 'code demo needs visible code');
    if (d.output !== undefined && d.error !== undefined) return err(at, 'code demo has both output and error');
    return validateResult(d, at, err);
  }
  if (!isStr(d.label)) err(at, 'rs-choice demo needs a label');
  if (!Array.isArray(d.opts) || d.opts.length < 2) return err(at, 'rs-choice demo needs 2+ options');
  if (d.start !== undefined && !inRange(d.start, d.opts.length)) err(at, 'rs-choice start out of range');
  d.opts.forEach((o, i) => {
    const oat = `${at}/option ${o.label ?? i}`;
    if (!isStr(o.label) || !hasCode(o.code)) err(oat, 'needs label and visible code');
    if ((o.output === undefined) === (o.error === undefined)) return err(oat, 'needs exactly one of output and error');
    validateResult(o, oat, err);
  });
}
```
In `src/content/validateCss.ts`, change the demo parameter type from `Demo` to `CssDemo` (and the import).

In `src/content/validate.ts`:
- Imports: add `import { isRustDemo } from './guards';`, `import { validateRustDemo } from './validateRust';`, and `CourseId`, `Demo` types; add `type Err` to the `./validateUtil` import.
- Replace `if (card.demo) validateCssDemo(card.demo, cat, err);` with `if (card.demo) validateDemo(c.id, card.demo, cat, err);`.
- Add at the bottom:
  ```ts
  function validateDemo(courseId: CourseId, d: Demo, at: string, err: Err) {
    if (isRustDemo(d) !== (courseId === 'rust')) {
      return err(at, `demo kind "${d.kind ?? 'knobs'}" does not belong in the ${courseId} course`);
    }
    if (isRustDemo(d)) validateRustDemo(d, at, err);
    else validateCssDemo(d, at, err);
  }
  ```

- [ ] **Step 7: Run everything**

Run: `npm run typecheck && npm test`
Expected: all PASS, and the CSS Learn tests are unchanged.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "Add Rust code and choice demos to Learn cards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---
### Task 9: Rust question model: types, validation, grading and feedback

This task adds everything about Rust questions except their screens, all tested with fixtures. `QuestionBody` renders nothing for Rust questions until Task 12; no Rust content is bundled until Task 11, so the app can't reach that path yet.

**Files:**
- Create: `src/quiz/rustFixtures.ts`, `src/quiz/grade/rust.ts`, `src/quiz/grade/rust.test.ts`, `src/quiz/feedback/rust.ts`, `src/quiz/feedback/rust.test.ts`, `src/quiz/FeedbackSheet.test.tsx`
- Modify: `src/content/typeKeys.ts`, `src/content/types.ts`, `src/content/guards.ts`, `src/content/validate.ts`, `src/content/validateRust.ts`, `src/content/validateRust.test.ts`, `src/quiz/grade/index.ts`, `src/quiz/feedback/shared.ts`, `src/quiz/feedback/index.ts`, `src/quiz/FeedbackSheet.tsx`, `src/quiz/FeedbackSheet.module.css`, `src/quiz/session.ts`, `src/quiz/Quiz.tsx`, `src/quiz/renderers/QuestionBody.tsx`

**Interfaces:**
- Consumes: `rustCode.ts` helpers (Task 7); `isRustError`, `BAD_ERROR` (Task 8).
- Produces:
  - `RUST_TYPE_KEYS`, `RustTypeKey`; `QuestionTypeKey = CssTypeKey | RustTypeKey`; `TYPE_KEYS.rust = RUST_TYPE_KEYS`.
  - Types `RustPredictQuestion`, `RustPairsQuestion`, `RustCompilesQuestion`, `RustBuildSegment`, `RustBuildLine`, `RustBuildQuestion`, `RustErrorQuestion`, `RustFixQuestion`, `RustTypeQuestion`, `RustQuestion`; `Question = CssQuestion | RustQuestion`.
  - Guards `isRustQuestion(q): q is RustQuestion`, `isPairs(q): q is PairsQuestion | RustPairsQuestion`, `isBuild(q): q is BuildQuestion | RustBuildQuestion`.
  - `validateRustQuestion(q, at, err)`.
  - `canCheckRust`, `isCorrectRust`; `rustFeedback(q, a, praise)`; `FeedbackText.compiler?: string`.
  - Fixtures `rsPredict`, `rsPredictError`, `rsPairs`, `rsCompiles`, `rsBuild`, `rsError`, `rsFix`, `rsType`.

- [ ] **Step 1: Add the Rust types, keys and guards**

In `src/content/typeKeys.ts`, replace `export type QuestionTypeKey = CssTypeKey;` and the `TYPE_KEYS` constant with:
```ts
/** Rust question types in difficulty order; rust/question-types.json must match. */
export const RUST_TYPE_KEYS = ['rs-predict', 'rs-pairs', 'rs-compiles', 'rs-build', 'rs-error', 'rs-fix', 'rs-type'] as const;
export type RustTypeKey = (typeof RUST_TYPE_KEYS)[number];

export type QuestionTypeKey = CssTypeKey | RustTypeKey;

/** Each course's question types, in the order its question-types.json must list them. */
export const TYPE_KEYS: Record<CourseId, readonly QuestionTypeKey[]> = {
  css: CSS_TYPE_KEYS,
  rust: RUST_TYPE_KEYS,
};
```
In `src/content/types.ts`, replace `export type Question = CssQuestion;` with:
```ts
// ----- Rust questions -----
// Code arrays are plain Rust. Lines starting with `# ` are hidden setup (see lib/rustCode.ts).
// `error` strings are rustc's first error line, e.g. `error[E0382]: borrow of moved value: \`s\``.

export interface RustPredictQuestion extends QuestionBase {
  type: 'rs-predict';
  code: string[];
  /** `output` options render as program output; the `error` option reads "Doesn't compile". */
  opts: { text: string; kind: 'output' | 'error' }[];
  answer: number;
  /** Required exactly when the answer is the `error` option. */
  error?: string;
}

export interface RustPairsQuestion extends QuestionBase {
  type: 'rs-pairs';
  items: { id: string; left: string; right: string }[];
  /** Right-column order, by item id. */
  order: string[];
}

export interface RustCompilesQuestion extends QuestionBase {
  type: 'rs-compiles';
  a: string[];
  b: string[];
  /** The snippet that compiles. */
  answer: 'a' | 'b';
  /** What rustc says about the other one. */
  error: string;
}

export type RustBuildSegment = string | { slot: number };
/** A plain line, or text segments with inline slots. */
export type RustBuildLine = string | RustBuildSegment[];

export interface RustBuildQuestion extends QuestionBase {
  type: 'rs-build';
  code: RustBuildLine[];
  /** May contain duplicates — chips are tracked by index. */
  bank: string[];
  /** The word for each slot, by slot number. */
  answer: string[];
  /** What the finished program prints. */
  output?: string[];
}

export interface RustErrorQuestion extends QuestionBase {
  type: 'rs-error';
  code: string[];
  /** 1-based visible line that rustc rejects. */
  answer: number;
  error: string;
}

export interface RustFixQuestion extends QuestionBase {
  type: 'rs-fix';
  code: string[];
  error: string;
  /** Each diff: `- old line` lines (a contiguous run of `code`) then `+ new line` lines. */
  opts: { diff: string[] }[];
  answer: number;
}

export interface RustTypeQuestion extends QuestionBase {
  type: 'rs-type';
  /** Exactly one `___` blank. */
  code: string[];
  /** Normalized answers (trimmed, single spaces); matching is case-sensitive. */
  accept: string[];
}

export type RustQuestion =
  | RustPredictQuestion
  | RustPairsQuestion
  | RustCompilesQuestion
  | RustBuildQuestion
  | RustErrorQuestion
  | RustFixQuestion
  | RustTypeQuestion;

export type Question = CssQuestion | RustQuestion;
```
Replace `src/content/guards.ts` with:
```ts
// Narrowing helpers for the content unions.
import type {
  BuildQuestion,
  Demo,
  PairsQuestion,
  Question,
  RustBuildQuestion,
  RustDemo,
  RustPairsQuestion,
  RustQuestion,
} from './types';

export function isRustDemo(d: Demo): d is RustDemo {
  return d.kind === 'code' || d.kind === 'rs-choice';
}

export function isRustQuestion(q: Question): q is RustQuestion {
  return q.type.startsWith('rs-');
}

/** Match pairs in any course: self-completing, never costs hearts. */
export function isPairs(q: Question): q is PairsQuestion | RustPairsQuestion {
  return q.type === 'pairs' || q.type === 'rs-pairs';
}

/** Word bank in any course: slots filled from bank chips. */
export function isBuild(q: Question): q is BuildQuestion | RustBuildQuestion {
  return q.type === 'build' || q.type === 'rs-build';
}
```

- [ ] **Step 2: Add fixtures**

Create `src/quiz/rustFixtures.ts`:
```ts
// Rust questions for pure unit tests (validation, grading, feedback, the checker).
// The real starter content lives in content/rust/questions.json.
import type {
  RustBuildQuestion,
  RustCompilesQuestion,
  RustErrorQuestion,
  RustFixQuestion,
  RustPairsQuestion,
  RustPredictQuestion,
  RustTypeQuestion,
} from '../content';

export const rsPredict: RustPredictQuestion = {
  id: 'rs-predict-1',
  type: 'rs-predict',
  prompt: 'What does this program print?',
  code: ['# fn main() {', 'let a = 5;', 'let mut b = a;', 'b += 1;', 'println!("{a} {b}");', '# }'],
  opts: [
    { text: '5 6', kind: 'output' },
    { text: '6 6', kind: 'output' },
    { text: "Doesn't compile", kind: 'error' },
  ],
  answer: 0,
  explain: '`i32` is `Copy`.',
};

export const rsPredictError: RustPredictQuestion = {
  ...rsPredict,
  id: 'rs-predict-2',
  answer: 2,
  error: 'error[E0382]: borrow of moved value: `s`',
};

export const rsPairs: RustPairsQuestion = {
  id: 'rs-pairs-1',
  type: 'rs-pairs',
  prompt: 'Match each type to what it means',
  items: [
    { id: 'own', left: 'String', right: 'Owned text' },
    { id: 'shr', left: '&String', right: 'Shared borrow' },
    { id: 'mut', left: '&mut String', right: 'Exclusive borrow' },
    { id: 'cln', left: 's.clone()', right: 'Deep copy' },
  ],
  order: ['mut', 'cln', 'own', 'shr'],
  explain: 'Owning vs borrowing.',
};

export const rsCompiles: RustCompilesQuestion = {
  id: 'rs-compiles-1',
  type: 'rs-compiles',
  prompt: 'Which one compiles?',
  a: ['let t = s;'],
  b: ['let t = &s;'],
  answer: 'b',
  error: 'error[E0382]: borrow of moved value: `s`',
  explain: 'A moves `s`.',
};

export const rsBuild: RustBuildQuestion = {
  id: 'rs-build-1',
  type: 'rs-build',
  prompt: 'Fill the blanks',
  code: [['fn shout(s: ', { slot: 0 }, ') -> String {'], '    s.to_uppercase()', '}', ['let loud = shout(', { slot: 1 }, ');']],
  bank: ['String', '&String', 'name', '&name'],
  answer: ['&String', '&name'],
  output: ['ferris FERRIS'],
  explain: 'Borrow it.',
};

export const rsError: RustErrorQuestion = {
  id: 'rs-error-1',
  type: 'rs-error',
  prompt: 'rustc rejects one line. Which one?',
  code: ['fn main() {', '    let v = vec![1];', '    let w = v;', '    println!("{}", v.len());', '}'],
  answer: 4,
  error: 'error[E0382]: borrow of moved value: `v`',
  explain: '`v` moved on line 3.',
};

export const rsFix: RustFixQuestion = {
  id: 'rs-fix-1',
  type: 'rs-fix',
  prompt: 'Pick the change that makes this compile',
  code: ['fn main() {', '    let s = String::from("hi");', '    let t = s;', '    println!("{s} {t}");', '}'],
  error: 'error[E0382]: borrow of moved value: `s`',
  opts: [
    { diff: ['-     let t = s;', '+     let t = s.clone();'] },
    { diff: ['-     println!("{s} {t}");', '+     println!("{t} {s}");'] },
    { diff: ['-     let s = String::from("hi");', '+     let mut s = String::from("hi");'] },
  ],
  answer: 0,
  explain: 'Clone it.',
};

export const rsType: RustTypeQuestion = {
  id: 'rs-type-1',
  type: 'rs-type',
  prompt: 'Type the missing token',
  code: ['fn add_one(v: ___ Vec<i32>) {', '    v.push(1);', '}'],
  accept: ['&mut', '& mut'],
  explain: 'Needs `&mut`.',
};
```

- [ ] **Step 3: Write the failing tests**

Append to `src/content/validateRust.test.ts` (and add `type RustQuestion` to the `./types` import, `validateRustQuestion` to the `./validateRust` import, and `import { rsBuild, rsCompiles, rsError, rsFix, rsPairs, rsPredict, rsPredictError, rsType } from '../quiz/rustFixtures';`):
```ts
const checkQ = (q: unknown) => {
  const errors: string[] = [];
  validateRustQuestion(q as RustQuestion, 'q', (where, msg) => errors.push(`${where}: ${msg}`));
  return errors;
};

describe('validateRustQuestion', () => {
  it('accepts every fixture', () => {
    for (const q of [rsPredict, rsPredictError, rsPairs, rsCompiles, rsBuild, rsError, rsFix, rsType]) expect(checkQ(q)).toEqual([]);
  });

  it.each([
    ['an error on an output answer', { ...rsPredict, error: 'error[E0382]: x' }, 'q: error is required exactly when the answer is the error option'],
    ['a missing error on an error answer', { ...rsPredictError, error: undefined }, 'q: error is required exactly when the answer is the error option'],
    ['too few predict options', { ...rsPredict, opts: rsPredict.opts.slice(0, 2) }, 'q: needs 3 or 4 opts'],
    ['a pairs question without 4 items', { ...rsPairs, items: rsPairs.items.slice(0, 3) }, 'q: needs exactly 4 items'],
    ['an unknown compiles answer', { ...rsCompiles, answer: 'c' }, "q: answer must be 'a' or 'b'"],
    ['a malformed error', { ...rsCompiles, error: 'borrow of moved value' }, 'q: error must look like "error[E0000]: message"'],
    ['a slot gap', { ...rsBuild, code: [['x', { slot: 1 }]] }, 'q: code must contain each slot 0..n-1 exactly once'],
    ['a bank missing an answer word', { ...rsBuild, bank: ['&String'] }, 'q: bank is missing answer word "&name"'],
    ['an error line past the end', { ...rsError, answer: 6 }, 'q: answer must be a visible line number'],
    ['a diff that does not apply', { ...rsFix, opts: [...rsFix.opts, { diff: ['- nope', '+ x'] }] }, 'q: option D diff does not apply to code'],
    ['a diff line without a prefix', { ...rsFix, opts: [...rsFix.opts, { diff: ['let t = s;'] }] }, 'q: option D diff lines must start with "- " or "+ "'],
    ['two blanks', { ...rsType, code: ['___ ___'] }, 'q: code needs exactly one ___ blank'],
    ['an accept that can never match', { ...rsType, accept: [' &mut'] }, 'q: accept " &mut" can never match normalized input'],
  ])('rejects %s', (_name, q, message) => {
    expect(checkQ(q)).toContain(message);
  });
});
```
Create `src/quiz/grade/rust.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Question } from '../../content';
import { rsBuild, rsCompiles, rsError, rsFix, rsPairs, rsPredict, rsType } from '../rustFixtures';
import type { AnswerState } from '../types';
import { canCheck, freshAnswer, isCorrect } from './index';

const answer = (q: Question, patch: Partial<AnswerState> = {}): AnswerState => ({ ...freshAnswer(q), ...patch });

describe('Rust grading', () => {
  it('starts rs-build slots empty', () => {
    expect(freshAnswer(rsBuild).slots).toEqual([null, null]);
  });

  it('grades single picks', () => {
    for (const q of [rsPredict, rsFix]) {
      expect(canCheck(q, answer(q))).toBe(false);
      expect(canCheck(q, answer(q, { sel: 1 }))).toBe(true);
      expect(isCorrect(q, answer(q, { sel: 0 }))).toBe(true);
      expect(isCorrect(q, answer(q, { sel: 1 }))).toBe(false);
    }
    expect(isCorrect(rsCompiles, answer(rsCompiles, { sel: 'b' }))).toBe(true);
    expect(isCorrect(rsCompiles, answer(rsCompiles, { sel: 'a' }))).toBe(false);
    expect(isCorrect(rsError, answer(rsError, { sel: 4 }))).toBe(true);
    expect(isCorrect(rsError, answer(rsError, { sel: 3 }))).toBe(false);
  });

  it('grades rs-build by the words placed, not their bank positions', () => {
    expect(canCheck(rsBuild, answer(rsBuild, { slots: [1, null] }))).toBe(false);
    expect(isCorrect(rsBuild, answer(rsBuild, { slots: [1, 3] }))).toBe(true);
    expect(isCorrect(rsBuild, answer(rsBuild, { slots: [0, 3] }))).toBe(false);
  });

  it('normalizes typed tokens but keeps case', () => {
    expect(canCheck(rsType, answer(rsType, { val: '   ' }))).toBe(false);
    expect(isCorrect(rsType, answer(rsType, { val: '  &mut  ' }))).toBe(true);
    expect(isCorrect(rsType, answer(rsType, { val: '&  mut' }))).toBe(true);
    expect(isCorrect(rsType, answer(rsType, { val: '&MUT' }))).toBe(false);
  });

  it('never offers Check for rs-pairs; it completes when every pair is matched', () => {
    expect(canCheck(rsPairs, answer(rsPairs))).toBe(false);
    expect(isCorrect(rsPairs, answer(rsPairs, { matched: { own: true, shr: true, mut: true } }))).toBe(false);
    expect(isCorrect(rsPairs, answer(rsPairs, { matched: { own: true, shr: true, mut: true, cln: true } }))).toBe(true);
  });
});
```
Create `src/quiz/feedback/rust.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Question } from '../../content';
import { freshAnswer } from '../grade';
import { rsBuild, rsCompiles, rsError, rsFix, rsPairs, rsPredict, rsPredictError, rsType } from '../rustFixtures';
import type { AnswerState } from '../types';
import { feedbackText } from './index';

const fb = (q: Question, patch: Partial<AnswerState>) => feedbackText(q, { ...freshAnswer(q), checked: true, ...patch }, 0);

describe('Rust feedback', () => {
  it('praises a right answer and shows rustc’s message for error questions', () => {
    expect(fb(rsFix, { ok: true, sel: 0 })).toEqual({ title: 'Nice — that’s right!', detail: null, compiler: rsFix.error });
  });

  it('gives the answer when wrong', () => {
    expect(fb(rsPredict, { ok: false, sel: 1 })).toEqual({ title: 'Not quite', detail: 'Answer: A' });
    expect(fb(rsCompiles, { ok: false, sel: 'a' }).detail).toBe('Answer: B');
    expect(fb(rsBuild, { ok: false }).detail).toBe('Answer: &String, &name');
    expect(fb(rsType, { ok: false }).detail).toBe('Answer: &mut');
    expect(fb(rsError, { ok: false, sel: 2 })).toEqual({ title: 'Not that one — it’s line 4', detail: null, compiler: rsError.error });
  });

  it('shows rustc’s message only when the question is about a compile error', () => {
    expect(fb(rsPredictError, { ok: true }).compiler).toBe(rsPredictError.error);
    expect(fb(rsPredict, { ok: true }).compiler).toBeUndefined();
    expect(fb(rsType, { ok: true }).compiler).toBeUndefined();
  });

  it('always reports mismatches for rs-pairs', () => {
    expect(fb(rsPairs, { ok: true, misses: 2 })).toEqual({ title: 'All pairs matched!', detail: '2 mismatches along the way.' });
  });
});
```
Create `src/quiz/FeedbackSheet.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackSheet } from './FeedbackSheet';
import { freshAnswer } from './grade';
import { rsError, rsType } from './rustFixtures';

describe('FeedbackSheet', () => {
  it('shows what rustc says for compile-error questions', () => {
    const answer = { ...freshAnswer(rsError), sel: 2, checked: true, ok: false };
    render(<FeedbackSheet question={rsError} answer={answer} index={0} guardMs={0} onContinue={vi.fn()} />);
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('Not that one — it’s line 4');
    expect(screen.getByText('rustc says')).toBeInTheDocument();
    expect(sheet).toHaveTextContent('error[E0382]: borrow of moved value: `v`');
  });

  it('has no compiler block for other questions', () => {
    const answer = { ...freshAnswer(rsType), val: '&mut', checked: true, ok: true };
    render(<FeedbackSheet question={rsType} answer={answer} index={0} guardMs={0} onContinue={vi.fn()} />);
    expect(screen.queryByText('rustc says')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run them to verify they fail**

Run: `npx vitest run src/content/validateRust.test.ts src/quiz/grade src/quiz/feedback src/quiz/FeedbackSheet.test.tsx`
Expected: FAIL: `validateRustQuestion` is missing and Rust questions reach the CSS graders.

- [ ] **Step 5: Validate Rust questions**

Add to `src/content/validateRust.ts`. Extend its imports to `import type { RustDemo, RustQuestion } from './types';`, `import { inRange, isInt, isStr, isStrArr, type Err } from './validateUtil';` and `import { applyDiff, BLANK, normalizeToken, TOKEN_MAX_LENGTH, visibleLines } from '../lib/rustCode';`:
```ts
function validateOpts(opts: unknown, at: string, err: Err): boolean {
  if (Array.isArray(opts) && opts.length >= 3 && opts.length <= 4) return true;
  err(at, 'needs 3 or 4 opts');
  return false;
}

export function validateRustQuestion(q: RustQuestion, at: string, err: Err) {
  switch (q.type) {
    case 'rs-predict': {
      if (!hasCode(q.code)) err(at, 'needs visible code');
      if (!validateOpts(q.opts, at, err)) return;
      q.opts.forEach((o, i) => {
        if (!isStr(o.text) || (o.kind !== 'output' && o.kind !== 'error')) err(at, `opt ${i} needs text and kind "output" or "error"`);
      });
      if (!inRange(q.answer, q.opts.length)) return err(at, 'answer out of range');
      if ((q.opts[q.answer]!.kind === 'error') !== (q.error !== undefined)) {
        err(at, 'error is required exactly when the answer is the error option');
      }
      if (q.error !== undefined && !isRustError(q.error)) err(at, BAD_ERROR);
      return;
    }
    case 'rs-pairs': {
      if (!Array.isArray(q.items) || q.items.length !== 4) return err(at, 'needs exactly 4 items');
      q.items.forEach((it, i) => {
        if (![it.id, it.left, it.right].every(isStr)) err(at, `item ${i} needs id, left and right`);
      });
      const itemIds = q.items.map((it) => it.id).sort().join();
      if (!isStrArr(q.order) || [...q.order].sort().join() !== itemIds) err(at, 'order must be a permutation of item ids');
      return;
    }
    case 'rs-compiles':
      if (!hasCode(q.a) || !hasCode(q.b)) err(at, 'needs visible code in a and b');
      if (q.answer !== 'a' && q.answer !== 'b') err(at, "answer must be 'a' or 'b'");
      if (!isRustError(q.error)) err(at, BAD_ERROR);
      return;
    case 'rs-build': {
      if (!isStrArr(q.answer) || q.answer.length === 0 || !isStrArr(q.bank)) return err(at, 'needs answer and bank as string lists');
      if (!Array.isArray(q.code)) return err(at, 'needs code[]');
      const slots: number[] = [];
      q.code.forEach((line, i) => {
        if (isStr(line)) return;
        const segs = Array.isArray(line) ? (line as unknown[]) : [];
        const ok = segs.length > 0 && segs.every((seg) => isStr(seg) || isInt((seg as { slot?: unknown } | null)?.slot));
        if (!ok) return err(at, `code line ${i + 1} must be a string or a list of strings and { slot }`);
        segs.forEach((seg) => {
          if (!isStr(seg)) slots.push((seg as { slot: number }).slot);
        });
      });
      if ([...slots].sort((x, y) => x - y).join() !== q.answer.map((_, i) => i).join()) {
        err(at, 'code must contain each slot 0..n-1 exactly once');
      }
      const bank = [...q.bank];
      q.answer.forEach((w) => {
        const i = bank.indexOf(w);
        if (i === -1) err(at, `bank is missing answer word "${w}"`);
        else bank.splice(i, 1);
      });
      if (q.output !== undefined && !isStrArr(q.output)) err(at, 'output must be a list of strings');
      return;
    }
    case 'rs-error':
      if (!hasCode(q.code)) return err(at, 'needs visible code');
      if (!isInt(q.answer) || q.answer < 1 || q.answer > visibleLines(q.code).length) err(at, 'answer must be a visible line number');
      if (!isRustError(q.error)) err(at, BAD_ERROR);
      return;
    case 'rs-fix':
      if (!hasCode(q.code)) return err(at, 'needs visible code');
      if (!isRustError(q.error)) err(at, BAD_ERROR);
      if (!validateOpts(q.opts, at, err)) return;
      q.opts.forEach((o, i) => {
        const name = `option ${String.fromCharCode(65 + i)}`;
        if (!isStrArr(o.diff) || !o.diff.every((l) => l.startsWith('- ') || l.startsWith('+ '))) {
          return err(at, `${name} diff lines must start with "- " or "+ "`);
        }
        if (!applyDiff(q.code, o.diff)) err(at, `${name} diff does not apply to code`);
      });
      if (!inRange(q.answer, q.opts.length)) err(at, 'answer out of range');
      return;
    case 'rs-type':
      if (!hasCode(q.code)) return err(at, 'needs visible code');
      if (q.code.join('\n').split(BLANK).length !== 2) err(at, `code needs exactly one ${BLANK} blank`);
      if (!isStrArr(q.accept) || q.accept.length === 0) return err(at, 'needs accept[]');
      q.accept.forEach((a) => {
        if (normalizeToken(a) !== a || a.length > TOKEN_MAX_LENGTH) err(at, `accept "${a}" can never match normalized input`);
      });
      return;
  }
}
```
In `src/content/validate.ts`, import `isRustQuestion` (from `./guards`) and `validateRustQuestion`, and replace `validateCssQuestion(q, at, err);` with:
```ts
    if (isRustQuestion(q)) validateRustQuestion(q, at, err);
    else validateCssQuestion(q, at, err);
```

- [ ] **Step 6: Grade Rust answers**

Create `src/quiz/grade/rust.ts`:
```ts
// Rust answer rules.
import type { RustQuestion } from '../../content';
import { normalizeToken } from '../../lib/rustCode';
import type { AnswerState } from '../types';

/** Whether Check is enabled (the caller has already ruled out a checked answer). rs-pairs has no Check. */
export function canCheckRust(q: RustQuestion, a: AnswerState): boolean {
  switch (q.type) {
    case 'rs-predict':
    case 'rs-compiles':
    case 'rs-error':
    case 'rs-fix':
      return a.sel !== null;
    case 'rs-build':
      return a.slots.every((s) => s !== null);
    case 'rs-type':
      return normalizeToken(a.val).length > 0;
    case 'rs-pairs':
      return false;
  }
}

export function isCorrectRust(q: RustQuestion, a: AnswerState): boolean {
  switch (q.type) {
    case 'rs-predict':
    case 'rs-compiles':
    case 'rs-error':
    case 'rs-fix':
      return a.sel === q.answer;
    case 'rs-build':
      return a.slots.every((ci, i) => ci !== null && q.bank[ci] === q.answer[i]);
    case 'rs-type':
      return q.accept.includes(normalizeToken(a.val));
    case 'rs-pairs':
      return q.items.every((it) => a.matched[it.id]);
  }
}
```
In `src/quiz/grade/index.ts`:
- Import: `import { isBuild, isRustQuestion, type Question } from '../../content';` and `import { canCheckRust, isCorrectRust } from './rust';`
- In `freshAnswer`: `slots: q && isBuild(q) ? q.answer.map(() => null) : [],`
- `canCheck`: `return isRustQuestion(q) ? canCheckRust(q, a) : canCheckCss(q, a);` (after the `a.checked` guard)
- `isCorrect`: `return isRustQuestion(q) ? isCorrectRust(q, a) : isCorrectCss(q, a);`

- [ ] **Step 7: Rust feedback copy**

In `src/quiz/feedback/shared.ts`, add to `FeedbackText`:
```ts
  /** rustc's message, for questions about a compile error. Absent otherwise. */
  compiler?: string;
```
Create `src/quiz/feedback/rust.ts`:
```ts
// Rust feedback copy. `compiler` carries rustc's message whenever the question is about a compile error.
import type { RustQuestion } from '../../content';
import type { AnswerState } from '../types';
import { optionLetter, pairsSummary, type FeedbackText } from './shared';

export function rustFeedback(q: RustQuestion, a: AnswerState, praise: string): FeedbackText {
  let title = a.ok ? praise : 'Not quite';
  if (q.type === 'rs-pairs') title = 'All pairs matched!';
  if (!a.ok && q.type === 'rs-error') title = `Not that one — it’s line ${q.answer}`;

  const detail = q.type === 'rs-pairs' ? pairsSummary(a.misses) : a.ok ? null : answerLine(q);
  const compiler = compilerMessage(q);
  return compiler ? { title, detail, compiler } : { title, detail };
}

function answerLine(q: RustQuestion): string | null {
  switch (q.type) {
    case 'rs-predict':
    case 'rs-fix':
      return `Answer: ${optionLetter(q.answer)}`;
    case 'rs-compiles':
      return `Answer: ${q.answer.toUpperCase()}`;
    case 'rs-build':
      return `Answer: ${q.answer.join(', ')}`;
    case 'rs-type':
      return `Answer: ${q.accept[0]}`;
    case 'rs-error':
    case 'rs-pairs':
      return null;
  }
}

function compilerMessage(q: RustQuestion): string | undefined {
  switch (q.type) {
    case 'rs-compiles':
    case 'rs-error':
    case 'rs-fix':
      return q.error;
    case 'rs-predict':
      return q.opts[q.answer]?.kind === 'error' ? q.error : undefined;
    default:
      return undefined;
  }
}
```
In `src/quiz/feedback/index.ts`, import `isRustQuestion` and `rustFeedback` and make the body:
```ts
  const praise = PRAISE[index % PRAISE.length]!;
  return isRustQuestion(q) ? rustFeedback(q, a, praise) : cssFeedback(q, a, praise);
```

- [ ] **Step 8: Show rustc's message in the feedback sheet**

In `src/quiz/FeedbackSheet.tsx`, destructure `compiler` from `feedbackText(…)`, and insert after the `.explain` paragraph:
```tsx
      {compiler && (
        <figure className={styles.compiler}>
          <figcaption className={styles.compilerLabel}>rustc says</figcaption>
          <pre className={styles.compilerText}>{compiler}</pre>
        </figure>
      )}
```
Append to `src/quiz/FeedbackSheet.module.css`:
```css
.compiler {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
}

/* --ink-muted is ≥ 6:1 on both --correct-bg and --wrong-bg. */
.compilerLabel {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.compilerText {
  margin: 0;
  padding: 8px 12px;
  background: var(--ink);
  color: var(--code-punct);
  border-radius: 10px;
  font-family: var(--font-code);
  font-size: 13px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
```

- [ ] **Step 9: Make the session and quiz screen family-agnostic**

In `src/quiz/session.ts`:
- Import `isBuild`, `isPairs` and `type RustPairsQuestion` from `'../content'`.
- `resolvePair(s: Session, q: PairsQuestion | RustPairsQuestion, …)`.
- `case 'placeWord'`: `if (!isBuild(q) || a.checked || …) return s;`
- `case 'pickPair'`: `if (!isPairs(q) || a.checked || …) return s;`

In `src/quiz/Quiz.tsx`, import `isPairs` from `'../content'` and replace the two footer conditions and the hint:
```tsx
        {!a.checked && !isPairs(q) && (
```
```tsx
        {!a.checked && isPairs(q) && (
          <div className={`${styles.bar} ${styles.hint}`}>
            <p>{q.type === 'rs-pairs' ? 'Tap a code item, then its meaning.' : 'Tap a property, then its result.'}</p>
```

In `src/quiz/renderers/QuestionBody.tsx`:
```tsx
import { isRustQuestion, type Question } from '../../content';
import { CssQuestionBody } from './css/CssQuestionBody';
import type { RendererProps } from './types';

/** The middle of the quiz screen for one question. */
export function QuestionBody({ question, answer, act }: RendererProps<Question>) {
  if (isRustQuestion(question)) return null; // RustQuestionBody arrives with the Rust renderers
  return <CssQuestionBody question={question} answer={answer} act={act} />;
}
```

- [ ] **Step 10: Run everything**

Run: `npm run typecheck && npm test`
Expected: all PASS; CSS test files are untouched.

- [ ] **Step 11: Commit**

```bash
git add src
git commit -m "Add Rust question types with validation, grading and feedback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---

### Task 10: `npm run check:rust`

**Files:**
- Create: `scripts/rust-check-lib.ts`, `scripts/rust-check-lib.test.ts`, `scripts/check-rust.ts`, `scripts/tsconfig.json`, `rust-toolchain.toml`
- Modify: `package.json`, `package-lock.json`, `vite.config.ts`

**Interfaces:**
- Consumes: `applyDiff`, `fillBlank`, `fillSlots`, `programSource`, `visibleLineNumber` (Task 7); Rust content types (Tasks 8–9); fixtures (Task 9).
- Produces:
  - `rust-check-lib.ts`: `type Expect`, `interface Snippet { where; code; expect }`, `type CompileResult`, `errorCode(message)`, `collectSnippets(units, questions): { snippets; problems }`, `judge(snippet, result): string | null`, `firstError(stderr): { errorCode; line }`.
  - CLI: `npm run check:rust [-- <content dir>]`. Prints `✗ <where>: <why>` per failure, then `<n> snippets checked, <m> failed`. Exit code 1 on any failure.
  - `npm run typecheck` also type-checks `scripts/`.

- [ ] **Step 1: Tooling**

```bash
npm install -D @types/node@^24
npm pkg set scripts.check:rust="node scripts/check-rust.ts"
npm pkg set scripts.typecheck="tsc --noEmit && tsc --noEmit -p scripts"
rustup toolchain install 1.93.0 --profile minimal
```
Create `rust-toolchain.toml`:
```toml
# rustc for `npm run check:rust` (content checks only; the app never runs Rust).
# Pinned so error codes and spans in authored answers stay stable.
[toolchain]
channel = "1.93.0"
profile = "minimal"
```
Create `scripts/tsconfig.json`:
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "types": ["node"]
  },
  "include": ["."]
}
```
In `vite.config.ts`, change the test `include` to `['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts']`.

- [ ] **Step 2: Write the failing test**

Create `scripts/rust-check-lib.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Unit } from '../src/content/types';
import { rsBuild, rsCompiles, rsError, rsFix, rsPairs, rsPredict, rsType } from '../src/quiz/rustFixtures';
import { collectSnippets, errorCode, firstError, judge, type Snippet } from './rust-check-lib.ts';

describe('errorCode', () => {
  it('reads the code from an authored error', () => {
    expect(errorCode('error[E0382]: borrow of moved value: `s`')).toBe('E0382');
    expect(errorCode('borrow of moved value')).toBeNull();
  });
});

describe('firstError', () => {
  it('reads the first error’s code and primary line from rustc JSON', () => {
    const stderr = [
      JSON.stringify({ $message_type: 'diagnostic', level: 'warning', code: { code: 'unused_variables' }, spans: [{ line_start: 2, is_primary: true }] }),
      JSON.stringify({
        $message_type: 'diagnostic',
        level: 'error',
        code: { code: 'E0382' },
        spans: [
          { line_start: 3, is_primary: false },
          { line_start: 5, is_primary: true },
        ],
      }),
      JSON.stringify({ $message_type: 'diagnostic', level: 'error', code: null, spans: [] }),
      'not json',
    ].join('\n');
    expect(firstError(stderr)).toEqual({ errorCode: 'E0382', line: 5 });
  });

  it('copes with no diagnostics', () => {
    expect(firstError('')).toEqual({ errorCode: null, line: null });
  });
});

describe('judge', () => {
  const code = ['# fn main() {', 'let a = 1;', 'let b = a;', '# }'];
  const snippet = (expect: Snippet['expect']): Snippet => ({ where: 'q', code, expect });

  it('passes matching results, mapping rustc lines to visible lines', () => {
    expect(judge(snippet({ kind: 'compiles' }), { ok: true, stdout: '' })).toBeNull();
    expect(judge(snippet({ kind: 'output', output: ['5 6'] }), { ok: true, stdout: '5 6\n' })).toBeNull();
    expect(judge(snippet({ kind: 'error', code: 'E0382', line: 2 }), { ok: false, errorCode: 'E0382', line: 3 })).toBeNull();
  });

  it('explains every kind of mismatch', () => {
    expect(judge(snippet({ kind: 'error', code: 'E0382' }), { ok: true, stdout: '' })).toBe('expected a compile error, but it compiled');
    expect(judge(snippet({ kind: 'error', code: 'E0382' }), { ok: false, errorCode: 'E0499', line: 2 })).toBe('expected E0382, rustc reported E0499');
    expect(judge(snippet({ kind: 'error', code: 'E0382', line: 1 }), { ok: false, errorCode: 'E0382', line: 3 })).toBe(
      'expected the error on line 1, rustc points at line 2',
    );
    expect(judge(snippet({ kind: 'error', code: 'E0382', line: 1 }), { ok: false, errorCode: 'E0382', line: 4 })).toBe(
      'expected the error on line 1, rustc points at a hidden line',
    );
    expect(judge(snippet({ kind: 'compiles' }), { ok: false, errorCode: 'E0308', line: 2 })).toBe('expected it to compile, rustc reported E0308');
    expect(judge(snippet({ kind: 'output', output: ['5 6'] }), { ok: true, stdout: '5 5\n' })).toBe('expected output "5 6", got "5 5"');
  });
});

describe('collectSnippets', () => {
  const units = [
    {
      key: 'u',
      name: 'U',
      blurb: '',
      cards: [
        { title: 'a', body: '', demo: { kind: 'code', code: ['fn main() {}'] } },
        {
          title: 'b',
          body: '',
          demo: {
            kind: 'rs-choice',
            label: 'x',
            opts: [
              { label: 'one', code: ['A'], output: ['1'] },
              { label: 'two', code: ['B'], error: 'error[E0499]: m' },
            ],
          },
        },
      ],
    },
  ] as unknown as Unit[];

  it('turns demos and questions into compile checks', () => {
    const { snippets, problems } = collectSnippets(units, [rsPredict, rsPairs, rsCompiles, rsBuild, rsError, rsFix, rsType]);
    expect(problems).toEqual([]);
    expect(snippets.map((s) => [s.where, s.expect])).toEqual([
      ['u/card 1', { kind: 'compiles' }],
      ['u/card 2/one', { kind: 'output', output: ['1'] }],
      ['u/card 2/two', { kind: 'error', code: 'E0499' }],
      ['rs-predict-1', { kind: 'output', output: ['5 6'] }],
      ['rs-compiles-1/b', { kind: 'compiles' }],
      ['rs-compiles-1/a', { kind: 'error', code: 'E0382' }],
      ['rs-build-1', { kind: 'output', output: ['ferris FERRIS'] }],
      ['rs-error-1', { kind: 'error', code: 'E0382', line: 4 }],
      ['rs-fix-1', { kind: 'error', code: 'E0382' }],
      ['rs-fix-1/option A', { kind: 'compiles' }],
      ['rs-fix-1/option B', { kind: 'error', code: null }],
      ['rs-fix-1/option C', { kind: 'error', code: null }],
      ['rs-type-1/&mut', { kind: 'compiles' }],
      ['rs-type-1/& mut', { kind: 'compiles' }],
    ]);
    const code = (where: string) => snippets.find((s) => s.where === where)!.code;
    expect(code('rs-build-1')[0]).toBe('fn shout(s: &String) -> String {');
    expect(code('rs-fix-1/option A')[2]).toBe('    let t = s.clone();');
    expect(code('rs-type-1/&mut')[0]).toBe('fn add_one(v: &mut Vec<i32>) {');
  });

  it('reports a fix diff that no longer applies', () => {
    const broken = { ...rsFix, opts: [{ diff: ['- gone', '+ x'] }, ...rsFix.opts.slice(1)] };
    expect(collectSnippets([], [broken]).problems).toEqual(['rs-fix-1/option A: diff does not apply to the code']);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run scripts`
Expected: FAIL: cannot find `./rust-check-lib.ts`.

- [ ] **Step 4: Implement the library**

Create `scripts/rust-check-lib.ts`:
```ts
// Pure logic for `npm run check:rust`: which Rust snippets to compile, what
// each must do, and how to read rustc's JSON diagnostics. check-rust.ts does the I/O.
import type { Question, Unit } from '../src/content/types';
import { applyDiff, fillBlank, fillSlots, visibleLineNumber } from '../src/lib/rustCode.ts';

export type Expect =
  | { kind: 'compiles' }
  | { kind: 'output'; output: string[] }
  /** `code` null = any error. `line` is a 1-based visible line. */
  | { kind: 'error'; code: string | null; line?: number };

export interface Snippet {
  /** Where it came from, for the report (e.g. `rs-fix-1/option B`). */
  where: string;
  /** Content lines, hidden `# ` lines included. */
  code: string[];
  expect: Expect;
}

export type CompileResult = { ok: true; stdout: string } | { ok: false; errorCode: string | null; line: number | null };

/** `error[E0382]: …` → `E0382`. */
export function errorCode(message: string): string | null {
  return /^error\[(E\d{4})\]/.exec(message)?.[1] ?? null;
}

function resultExpect(r: { output?: string[]; error?: string }): Expect {
  if (r.error !== undefined) return { kind: 'error', code: errorCode(r.error) };
  if (r.output !== undefined) return { kind: 'output', output: r.output };
  return { kind: 'compiles' };
}

export function collectSnippets(units: readonly Unit[], questions: readonly Question[]): { snippets: Snippet[]; problems: string[] } {
  const snippets: Snippet[] = [];
  const problems: string[] = [];
  const add = (where: string, code: readonly string[], expect: Expect) => snippets.push({ where, code: [...code], expect });

  for (const unit of units) {
    unit.cards.forEach((card, i) => {
      const where = `${unit.key}/card ${i + 1}`;
      const demo = card.demo;
      if (demo?.kind === 'code') add(where, demo.code, resultExpect(demo));
      if (demo?.kind === 'rs-choice') demo.opts.forEach((o) => add(`${where}/${o.label}`, o.code, resultExpect(o)));
    });
  }

  for (const q of questions) {
    switch (q.type) {
      case 'rs-predict': {
        const pick = q.opts[q.answer];
        if (!pick) break;
        add(q.id, q.code, pick.kind === 'error' ? { kind: 'error', code: errorCode(q.error ?? '') } : { kind: 'output', output: pick.text.split('\n') });
        break;
      }
      case 'rs-compiles': {
        const other = q.answer === 'a' ? 'b' : 'a';
        add(`${q.id}/${q.answer}`, q[q.answer], { kind: 'compiles' });
        add(`${q.id}/${other}`, q[other], { kind: 'error', code: errorCode(q.error) });
        break;
      }
      case 'rs-build':
        add(q.id, fillSlots(q.code, q.answer), q.output ? { kind: 'output', output: q.output } : { kind: 'compiles' });
        break;
      case 'rs-error':
        add(q.id, q.code, { kind: 'error', code: errorCode(q.error), line: q.answer });
        break;
      case 'rs-fix':
        add(q.id, q.code, { kind: 'error', code: errorCode(q.error) });
        q.opts.forEach((o, i) => {
          const where = `${q.id}/option ${String.fromCharCode(65 + i)}`;
          const fixed = applyDiff(q.code, o.diff);
          if (!fixed) problems.push(`${where}: diff does not apply to the code`);
          else add(where, fixed, i === q.answer ? { kind: 'compiles' } : { kind: 'error', code: null });
        });
        break;
      case 'rs-type':
        q.accept.forEach((value) => add(`${q.id}/${value}`, fillBlank(q.code, value), { kind: 'compiles' }));
        break;
      default:
        break; // rs-pairs and CSS questions have nothing to compile
    }
  }
  return { snippets, problems };
}

/** Why a compile result doesn't match the snippet's expectation, or null when it does. */
export function judge(s: Snippet, r: CompileResult): string | null {
  const e = s.expect;
  if (e.kind === 'error') {
    if (r.ok) return 'expected a compile error, but it compiled';
    if (e.code && r.errorCode !== e.code) return `expected ${e.code}, rustc reported ${r.errorCode ?? 'no error code'}`;
    if (e.line !== undefined) {
      const shown = r.line === null ? null : visibleLineNumber(s.code, r.line);
      if (shown !== e.line) return `expected the error on line ${e.line}, rustc points at ${shown === null ? 'a hidden line' : `line ${shown}`}`;
    }
    return null;
  }
  if (!r.ok) return `expected it to compile, rustc reported ${r.errorCode ?? 'an error'}`;
  if (e.kind === 'output') {
    const got = r.stdout.replace(/\n$/, '');
    const want = e.output.join('\n');
    if (got !== want) return `expected output ${JSON.stringify(want)}, got ${JSON.stringify(got)}`;
  }
  return null;
}

interface Diagnostic {
  $message_type?: string;
  level?: string;
  code?: { code?: string } | null;
  spans?: { line_start: number; is_primary: boolean }[];
}

/** The first error in rustc's `--error-format=json` stderr: its code and primary (program) line. */
export function firstError(stderr: string): { errorCode: string | null; line: number | null } {
  for (const raw of stderr.split('\n')) {
    if (!raw.startsWith('{')) continue;
    let d: Diagnostic;
    try {
      d = JSON.parse(raw) as Diagnostic;
    } catch {
      continue;
    }
    // Skip warnings and the span-less "aborting due to …" summary.
    if (d.$message_type !== 'diagnostic' || d.level !== 'error' || !d.spans?.length) continue;
    return { errorCode: d.code?.code ?? null, line: d.spans.find((sp) => sp.is_primary)?.line_start ?? null };
  }
  return { errorCode: null, line: null };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run scripts && npm run typecheck`
Expected: PASS (7 tests); both `tsc` runs are clean.

- [ ] **Step 6: Write the CLI**

Create `scripts/check-rust.ts`:
```ts
// `npm run check:rust [-- dir]`: compile every Rust snippet in content/rust (or `dir`)
// with the pinned toolchain, run it, and compare with its authored output or error.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Question, Unit } from '../src/content/types';
import { programSource } from '../src/lib/rustCode.ts';
import { collectSnippets, firstError, judge, type CompileResult, type Snippet } from './rust-check-lib.ts';

const dir = resolve(process.argv[2] ?? join(import.meta.dirname, '../content/rust'));
const read = <T>(file: string): T => JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;

function compile(s: Snippet, work: string, n: number): CompileResult {
  const src = join(work, `snippet${n}.rs`);
  const bin = join(work, `snippet${n}`);
  writeFileSync(src, programSource(s.code));
  const rustc = spawnSync('rustc', ['--edition', '2024', '--error-format=json', '-A', 'warnings', '-o', bin, src], { encoding: 'utf8' });
  if (rustc.error) throw rustc.error;
  if (rustc.status !== 0) return { ok: false, ...firstError(rustc.stderr) };
  const run = spawnSync(bin, { encoding: 'utf8', timeout: 5000 });
  return { ok: true, stdout: run.stdout ?? '' };
}

const version = spawnSync('rustc', ['--version'], { encoding: 'utf8' });
if (version.error || version.status !== 0) {
  console.error('check:rust needs rustc on PATH (the version is pinned in rust-toolchain.toml).');
  process.exit(1);
}
console.log(version.stdout.trim());

const { snippets, problems } = collectSnippets(read<Unit[]>('lessons.json'), read<Question[]>('questions.json'));
const failures = [...problems];
const work = mkdtempSync(join(tmpdir(), 'check-rust-'));
try {
  snippets.forEach((s, i) => {
    const why = judge(s, compile(s, work, i));
    if (why) failures.push(`${s.where}: ${why}`);
  });
} finally {
  rmSync(work, { recursive: true, force: true });
}

for (const f of failures) console.error(`✗ ${f}`);
console.log(`${snippets.length} snippets checked, ${failures.length} failed`);
process.exitCode = failures.length ? 1 : 0;
```

- [ ] **Step 7: Try the CLI on a throwaway fixture**

```bash
FIX=$(mktemp -d)
echo '[]' > "$FIX/lessons.json"
cat > "$FIX/questions.json" <<'EOF'
[
  { "id": "ok", "type": "rs-predict", "prompt": "", "explain": "",
    "code": ["# fn main() {", "println!(\"hi\");", "# }"],
    "opts": [{ "text": "hi", "kind": "output" }, { "text": "no", "kind": "output" }, { "text": "x", "kind": "error" }],
    "answer": 0 },
  { "id": "bad", "type": "rs-error", "prompt": "", "explain": "",
    "code": ["fn main() {", "    let v = vec![1];", "    let w = v;", "    println!(\"{}\", v.len());", "}"],
    "answer": 2, "error": "error[E0382]: borrow of moved value: `v`" }
]
EOF
npm run check:rust -- "$FIX"; echo "exit=$?"
rm -rf "$FIX"
```
Expected output ends with:
```
✗ bad: expected the error on line 2, rustc points at line 4
2 snippets checked, 1 failed
exit=1
```

- [ ] **Step 8: Commit**

```bash
git add scripts rust-toolchain.toml package.json package-lock.json vite.config.ts
git commit -m "Add check:rust to compile Rust content snippets against their authored answers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---

### Task 11: Rust starter course content and its CI job

Once this lands, the picker lists Rust. `rs-*` questions render blank until Tasks 12–14. Don't push this task alone.

**Files:**
- Create: `content/rust/lessons.json`, `content/rust/questions.json`, `content/rust/question-types.json`, `content/rust/topics.json`
- Modify: `content/courses.json`, `src/content/index.ts`, `src/content/content.test.ts`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: everything from Tasks 3–10.
- Produces: `courseById('rust')` with unit `ownership` (5 cards) and questions `rs-predict-1`, `rs-pairs-1`, `rs-compiles-1`, `rs-build-1`, `rs-error-1`, `rs-fix-1`, `rs-type-1`; CI job `rust-content`.

- [ ] **Step 1: Write the failing test**

Append to `src/content/content.test.ts`:
```ts
describe('rust content', () => {
  const rust = courseById('rust');

  it('has the starter unit and one question per type, in type order', () => {
    expect(rust.units.map((u) => u.key)).toEqual(['ownership']);
    expect(rust.units[0]!.cards).toHaveLength(5);
    expect(rust.questions.map((q) => q.type)).toEqual(rust.questionTypes.map((t) => t.key));
  });

  it('builds runs from Rust questions only', () => {
    expect(lessonQuestionIds(rust, 'mixed', () => 0)).toEqual([
      'rs-predict-1',
      'rs-pairs-1',
      'rs-compiles-1',
      'rs-build-1',
      'rs-error-1',
      'rs-fix-1',
      'rs-type-1',
    ]);
    expect(lessonQuestionIds(rust, 'topic:ownership')).toHaveLength(7);
    expect(lessonName(rust, 'topic:ownership')).toBe('Ownership & moves — practice');
    expect(lessonName(rust, 'rs-fix')).toBe('Fix it');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/content/content.test.ts`
Expected: FAIL: `Unknown course "rust"`.

- [ ] **Step 3: Write the content**

Every snippet below was compiled with rustc 1.93.0 while writing this plan: the outputs, error codes and error lines are real. Copy them exactly.

`content/rust/question-types.json`:
```json
[
  { "key": "rs-predict", "name": "Predict the output", "blurb": "Read Rust, pick what it prints" },
  { "key": "rs-pairs", "name": "Match pairs", "blurb": "Code ↔ what it means" },
  { "key": "rs-compiles", "name": "Compiles?", "blurb": "Pick the snippet rustc accepts" },
  { "key": "rs-build", "name": "Word bank", "blurb": "Fill the blanks, see the output" },
  { "key": "rs-error", "name": "Spot the error", "blurb": "Find the line rustc rejects" },
  { "key": "rs-fix", "name": "Fix it", "blurb": "Pick the change that compiles" },
  { "key": "rs-type", "name": "Type the token", "blurb": "Recall it from memory" }
]
```
`content/rust/topics.json`:
```json
{
  "ownership": ["rs-predict-1", "rs-pairs-1", "rs-compiles-1", "rs-build-1", "rs-error-1", "rs-fix-1", "rs-type-1"]
}
```
`content/rust/lessons.json`:
```json
[
  {
    "key": "ownership",
    "name": "Ownership & moves",
    "blurb": "One owner per value, and what borrowing buys you",
    "cards": [
      {
        "title": "Every value has one owner",
        "body": "A `String` keeps its text on the heap and belongs to exactly one variable. When that owner goes out of scope, Rust frees the text for you — no garbage collector, no manual `free()`.",
        "tip": "Owner leaves scope → value is dropped.",
        "demo": {
          "kind": "code",
          "code": ["fn main() {", "    let s = String::from(\"hi\");", "    println!(\"{s}\");", "} // s is dropped here"],
          "output": ["hi"]
        }
      },
      {
        "title": "Assignment moves",
        "body": "Assigning a `String` to another variable moves it: the new variable becomes the owner and the old one can no longer be used. Pick what `t` gets and watch the compiler react.",
        "tip": "`let t = s;` moves a `String`. Use `s.clone()` for a second copy, or `&s` to borrow.",
        "demo": {
          "kind": "rs-choice",
          "label": "let t = …",
          "opts": [
            {
              "label": "s",
              "code": ["# fn main() {", "let s = String::from(\"hi\");", "let t = s;", "println!(\"{s} {t}\");", "# }"],
              "error": "error[E0382]: borrow of moved value: `s`",
              "note": "The String moved into `t`, so `s` is no longer usable."
            },
            {
              "label": "s.clone()",
              "code": ["# fn main() {", "let s = String::from(\"hi\");", "let t = s.clone();", "println!(\"{s} {t}\");", "# }"],
              "output": ["hi hi"],
              "note": "`clone()` copies the heap text: two owners, two Strings."
            },
            {
              "label": "&s",
              "code": ["# fn main() {", "let s = String::from(\"hi\");", "let t = &s;", "println!(\"{s} {t}\");", "# }"],
              "output": ["hi hi"],
              "note": "`t` borrows the String; `s` still owns it."
            }
          ]
        }
      },
      {
        "title": "Copy types don't move",
        "body": "Integers, `bool`, `char` and other small fixed-size types are `Copy`: assignment copies the bits, so both variables stay usable.",
        "tip": "Only types that own heap data (like `String` and `Vec`) move on assignment.",
        "demo": {
          "kind": "code",
          "code": ["# fn main() {", "let a = 5;", "let b = a;", "println!(\"{a} {b}\");", "# }"],
          "output": ["5 5"]
        }
      },
      {
        "title": "Borrowing with &",
        "body": "A function that only needs to read a value can take a reference, `&String`. The caller passes `&s` and keeps ownership.",
        "tip": "`&T` lends a value without giving it away.",
        "demo": {
          "kind": "code",
          "code": [
            "fn len(s: &String) -> usize {",
            "    s.len()",
            "}",
            "",
            "fn main() {",
            "    let s = String::from(\"hello\");",
            "    let n = len(&s);",
            "    println!(\"{s} has {n} bytes\");",
            "}"
          ],
          "output": ["hello has 5 bytes"]
        }
      },
      {
        "title": "&mut is exclusive",
        "body": "To change a borrowed value you need `&mut`. While a `&mut` borrow is in use, nothing else may touch the value — not even another `&mut`.",
        "tip": "Many `&T` or one `&mut T` — never both at once.",
        "demo": {
          "kind": "rs-choice",
          "label": "Borrows",
          "opts": [
            {
              "label": "one &mut",
              "code": ["# fn main() {", "let mut v = vec![1, 2];", "let r = &mut v;", "r.push(3);", "println!(\"{v:?}\");", "# }"],
              "output": ["[1, 2, 3]"],
              "note": "`r` is done before `println!` reads `v`, so this is fine."
            },
            {
              "label": "two &mut",
              "code": ["# fn main() {", "let mut v = vec![1, 2];", "let a = &mut v;", "let b = &mut v;", "a.push(3);", "b.push(4);", "# }"],
              "error": "error[E0499]: cannot borrow `v` as mutable more than once at a time",
              "note": "`a` is still in use when `b` borrows `v` again."
            }
          ]
        }
      }
    ]
  }
]
```
`content/rust/questions.json`:
```json
[
  {
    "id": "rs-predict-1",
    "type": "rs-predict",
    "prompt": "What does this program print?",
    "code": ["# fn main() {", "let a = 5;", "let mut b = a;", "b += 1;", "println!(\"{a} {b}\");", "# }"],
    "opts": [
      { "text": "5 6", "kind": "output" },
      { "text": "6 6", "kind": "output" },
      { "text": "5 5", "kind": "output" },
      { "text": "Doesn't compile", "kind": "error" }
    ],
    "answer": 0,
    "explain": "`i32` is `Copy`, so `let mut b = a;` copies the number. Changing `b` leaves `a` at 5."
  },
  {
    "id": "rs-pairs-1",
    "type": "rs-pairs",
    "prompt": "Match each type to what it means",
    "items": [
      { "id": "own", "left": "String", "right": "Owned, growable text" },
      { "id": "shr", "left": "&String", "right": "Shared borrow, read-only" },
      { "id": "mut", "left": "&mut String", "right": "Exclusive borrow, can change it" },
      { "id": "cln", "left": "s.clone()", "right": "A deep copy with its own owner" }
    ],
    "order": ["mut", "cln", "own", "shr"],
    "explain": "Owning, borrowing and copying are the three ways to hand a `String` around. `&` reads, `&mut` changes, `clone()` duplicates."
  },
  {
    "id": "rs-compiles-1",
    "type": "rs-compiles",
    "prompt": "Which one compiles?",
    "a": ["# fn main() {", "let s = String::from(\"hi\");", "let t = s;", "println!(\"{s} {t}\");", "# }"],
    "b": ["# fn main() {", "let s = String::from(\"hi\");", "let t = &s;", "println!(\"{s} {t}\");", "# }"],
    "answer": "b",
    "error": "error[E0382]: borrow of moved value: `s`",
    "explain": "In A, `let t = s;` moves the String into `t`, so `s` can't be printed afterwards. B only borrows it."
  },
  {
    "id": "rs-build-1",
    "type": "rs-build",
    "prompt": "Fill the blanks so `shout` borrows the name and `main` can still print it",
    "code": [
      ["fn shout(s: ", { "slot": 0 }, ") -> String {"],
      "    s.to_uppercase()",
      "}",
      "",
      "fn main() {",
      "    let name = String::from(\"ferris\");",
      ["    let loud = shout(", { "slot": 1 }, ");"],
      "    println!(\"{name} {loud}\");",
      "}"
    ],
    "bank": ["String", "&String", "name", "&name", "&mut name"],
    "answer": ["&String", "&name"],
    "output": ["ferris FERRIS"],
    "explain": "The parameter type `&String` asks for a borrow, and the call passes one with `&name`. Ownership stays in `main`."
  },
  {
    "id": "rs-error-1",
    "type": "rs-error",
    "prompt": "rustc rejects one line. Which one?",
    "code": [
      "fn main() {",
      "    let v = vec![1, 2, 3];",
      "    let w = v;",
      "    println!(\"{}\", w.len());",
      "    println!(\"{}\", v.len());",
      "}"
    ],
    "answer": 5,
    "error": "error[E0382]: borrow of moved value: `v`",
    "explain": "Line 3 moves the vector into `w`. That line is fine; rustc reports the error where `v` is used after the move."
  },
  {
    "id": "rs-fix-1",
    "type": "rs-fix",
    "prompt": "Pick the change that makes this compile",
    "code": ["fn main() {", "    let s = String::from(\"hi\");", "    let t = s;", "    println!(\"{s} {t}\");", "}"],
    "error": "error[E0382]: borrow of moved value: `s`",
    "opts": [
      { "diff": ["-     let t = s;", "+     let t = s.clone();"] },
      { "diff": ["-     println!(\"{s} {t}\");", "+     println!(\"{t} {s}\");"] },
      { "diff": ["-     let s = String::from(\"hi\");", "+     let mut s = String::from(\"hi\");"] }
    ],
    "answer": 0,
    "explain": "`s.clone()` gives `t` its own String, so `s` is never moved. Reordering the print or adding `mut` doesn't undo the move."
  },
  {
    "id": "rs-type-1",
    "type": "rs-type",
    "prompt": "Type the missing token so `add_one` can change the vector",
    "code": [
      "fn add_one(v: ___ Vec<i32>) {",
      "    v.push(1);",
      "}",
      "",
      "fn main() {",
      "    let mut v = vec![];",
      "    add_one(&mut v);",
      "    println!(\"{v:?}\");",
      "}"
    ],
    "accept": ["&mut", "& mut"],
    "explain": "Changing a borrowed value needs an exclusive borrow: `&mut Vec<i32>`."
  }
]
```
Append to `content/courses.json` (second entry):
```json
  {
    "id": "rust",
    "name": "Rust",
    "tagline": "Rust, one tap at a time",
    "blurb": "Ownership, borrowing, enums and errors, for developers who already code.",
    "icon": "rust"
  }
```

- [ ] **Step 4: Bundle it**

In `src/content/index.ts`, add the four imports:
```ts
import rustLessons from '../../content/rust/lessons.json';
import rustQuestions from '../../content/rust/questions.json';
import rustQuestionTypes from '../../content/rust/question-types.json';
import rustTopics from '../../content/rust/topics.json';
```
and to `BUNDLES`:
```ts
  rust: {
    units: rustLessons as unknown as readonly Unit[],
    questions: rustQuestions as unknown as readonly Question[],
    questionTypes: rustQuestionTypes as unknown as readonly QuestionTypeInfo[],
    topics: rustTopics as Topics,
  },
```

- [ ] **Step 5: Run the tests and the content check**

Run: `npm run typecheck && npm test && npm run check:rust`
Expected: all tests PASS (including `Rust content › passes validation`), and `check:rust` ends with `19 snippets checked, 0 failed`.

- [ ] **Step 6: Add the CI job**

Append to `.github/workflows/ci.yml` under `jobs:`:
```yaml
  rust-content:
    name: Rust content compiles
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      # Reads rust-toolchain.toml. The checker calls rustc directly, so no cargo cache.
      - uses: actions-rust-lang/setup-rust-toolchain@v1
        with:
          cache: false
          rustflags: ''
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run check:rust
```
(Check `gh api repos/actions-rust-lang/setup-rust-toolchain/releases/latest --jq .tag_name` and use its major.)

- [ ] **Step 7: Commit**

```bash
git add content src/content .github/workflows/ci.yml
git commit -m "Add the Rust starter course and a CI job that compiles its snippets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---
### Task 12: Rust renderers I: Predict the output, Compiles?, Fix it

**Files:**
- Create: `src/quiz/renderers/rust/RustQuestionBody.tsx`, `RustPredict.tsx` + `.module.css` + `.test.tsx`, `RustCompiles.tsx` + `.module.css` + `.test.tsx`, `RustFix.tsx` + `.module.css` + `.test.tsx`, and `choice.module.css`, all in `src/quiz/renderers/rust/`
- Modify: `src/quiz/renderers/QuestionBody.tsx`

**Interfaces:**
- Consumes: `CodePanel` (`lang`, `id`), `OutputPanel` (Task 7); `tone`, `toneLabel`, `ToneMark`, `tone.module.css`; `parseDiff` (Task 7); `renderQuiz(…, courseId)` (Task 3); Rust content (Task 11).
- Produces: `RustQuestionBody(props: RendererProps<RustQuestion>)` (Tasks 13–14 add cases), `RustPredict`, `RustCompiles`, `RustFix`.

- [ ] **Step 1: Write the failing tests**

`src/quiz/renderers/rust/RustPredict.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-predict-1 prints "5 6" (option A)
describe('Predict the output (Rust)', () => {
  it('shows the visible code and every option as text', () => {
    renderQuiz('rs-predict', {}, 0, 'rust');
    expect(screen.getByText('Predict the output')).toBeInTheDocument();
    const code = screen.getByLabelText('Rust code');
    expect(code).toHaveTextContent('let mut b = a;');
    expect(code).not.toHaveTextContent('fn main');
    expect(screen.getAllByRole('button', { name: /^Option [A-D]:/ })).toHaveLength(4);
    expect(screen.getByRole('button', { name: "Option D: Doesn't compile" })).toBeInTheDocument();
  });

  it('marks a wrong pick with text and gives the answer', async () => {
    const { user } = renderQuiz('rs-predict', {}, 0, 'rust');
    await user.click(screen.getByRole('button', { name: 'Option B: 6 6' }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Answer: A');
    expect(screen.getByRole('button', { name: 'Option A: 5 6, correct answer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Option B: 6 6, your answer, incorrect' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('rustc says')).not.toBeInTheDocument();
  });
});
```
`src/quiz/renderers/rust/RustCompiles.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-compiles-1: A moves `s` (E0382), B borrows it and compiles
describe('Compiles? (Rust)', () => {
  it('describes each snippet by its code, grades the pick and shows rustc’s message', async () => {
    const { user } = renderQuiz('rs-compiles', {}, 0, 'rust');
    const a = screen.getByRole('button', { name: 'Snippet A' });
    expect(a).toHaveAccessibleDescription(/let t = s;/);
    await user.click(a);
    expect(a).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('Answer: B');
    expect(sheet).toHaveTextContent('rustc says');
    expect(sheet).toHaveTextContent('error[E0382]: borrow of moved value: `s`');
    expect(screen.getByRole('button', { name: 'Snippet B, correct answer' })).toBeInTheDocument();
    expect(screen.getByText('4 hearts left')).toBeInTheDocument();
  });
});
```
`src/quiz/renderers/rust/RustFix.test.tsx`:
```tsx
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-fix-1: option A clones `s`
describe('Fix it (Rust)', () => {
  it('shows the compiler error first and each fix as a readable diff', async () => {
    const { user } = renderQuiz('rs-fix', {}, 0, 'rust');
    expect(screen.getByRole('region', { name: 'Compiler error' })).toHaveTextContent('E0382');
    expect(screen.getByLabelText('Rust code')).toHaveTextContent('let t = s;');
    const a = screen.getByRole('button', { name: 'Option A: change “let t = s;” to “let t = s.clone();”' });
    expect(within(a).getByText('−')).toBeInTheDocument();
    expect(within(a).getByText('+')).toBeInTheDocument();
    await user.click(a);
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/quiz/renderers/rust`
Expected: FAIL: no "Rust code" label; the question body is empty.

- [ ] **Step 3: Shared choice-tile styles**

Create `src/quiz/renderers/rust/choice.module.css`:
```css
/* Stacked answer tiles for the Rust single-pick types. Tone colors come from tone.module.css. */
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tile {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 10px 40px 10px 14px;
  text-align: left;
}

.letter {
  flex-shrink: 0;
  width: 1.5ch;
  font-weight: 700;
  font-size: 15px;
}
```

- [ ] **Step 4: Implement the renderers**

`src/quiz/renderers/rust/RustPredict.tsx`:
```tsx
import type { RustPredictQuestion } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { tone, toneLabel } from '../../tone';
import { ToneMark } from '../../ToneMark';
import toneStyles from '../../tone.module.css';
import type { RendererProps } from '../types';
import choice from './choice.module.css';
import styles from './RustPredict.module.css';

/** Read Rust, pick what it prints — or that it doesn't compile. */
export function RustPredict({ question: q, answer, act }: RendererProps<RustPredictQuestion>) {
  return (
    <>
      <CodePanel lines={q.code} lang="rust" label="Rust code" />
      <div className={choice.list} role="group" aria-label="Options">
        {q.opts.map((o, i) => {
          const letter = String.fromCharCode(65 + i);
          const t = tone(answer.sel === i, i === q.answer, answer.checked);
          return (
            <button
              key={i}
              type="button"
              className={`${toneStyles.tile} ${toneStyles[t]} ${choice.tile}`}
              aria-pressed={answer.sel === i}
              aria-label={`Option ${letter}: ${o.text}${toneLabel(t)}`}
              onClick={() => act({ type: 'select', sel: i })}
            >
              <span className={choice.letter}>{letter}</span>
              <span className={o.kind === 'output' ? styles.output : styles.error}>{o.text}</span>
              <ToneMark tone={t} />
            </button>
          );
        })}
      </div>
    </>
  );
}
```
`src/quiz/renderers/rust/RustPredict.module.css`:
```css
.output {
  font-family: var(--font-code);
  font-size: 14px;
  white-space: pre;
  overflow-x: auto;
}

.error {
  font-weight: 700;
}
```
`src/quiz/renderers/rust/RustCompiles.tsx`:
```tsx
import { useId } from 'react';
import type { RustCompilesQuestion } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { tone, toneLabel } from '../../tone';
import { ToneMark } from '../../ToneMark';
import toneStyles from '../../tone.module.css';
import type { RendererProps } from '../types';
import choice from './choice.module.css';
import styles from './RustCompiles.module.css';

/** Two near-identical snippets; pick the one rustc accepts. Each tile is described by its code. */
export function RustCompiles({ question: q, answer, act }: RendererProps<RustCompilesQuestion>) {
  const idBase = useId();
  return (
    <div className={choice.list} role="group" aria-label="Snippets">
      {(['a', 'b'] as const).map((key) => {
        const letter = key.toUpperCase();
        const codeId = `${idBase}-${key}`;
        const t = tone(answer.sel === key, key === q.answer, answer.checked);
        return (
          <button
            key={key}
            type="button"
            className={`${toneStyles.tile} ${toneStyles[t]} ${choice.tile} ${styles.tile}`}
            aria-pressed={answer.sel === key}
            aria-label={`Snippet ${letter}${toneLabel(t)}`}
            aria-describedby={codeId}
            onClick={() => act({ type: 'select', sel: key })}
          >
            <span className={choice.letter}>{letter}</span>
            <span className={styles.code}>
              <CodePanel id={codeId} lines={q[key]} lang="rust" />
            </span>
            <ToneMark tone={t} />
          </button>
        );
      })}
    </div>
  );
}
```
`src/quiz/renderers/rust/RustCompiles.module.css`:
```css
.tile {
  align-items: flex-start;
  padding: 10px 36px 10px 10px;
}

.code {
  flex-grow: 1;
  min-width: 0;
}
```
`src/quiz/renderers/rust/RustFix.tsx`:
```tsx
import type { RustFixQuestion } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { OutputPanel } from '../../../components/OutputPanel';
import { parseDiff } from '../../../lib/rustCode';
import { tone, toneLabel } from '../../tone';
import { ToneMark } from '../../ToneMark';
import toneStyles from '../../tone.module.css';
import type { RendererProps } from '../types';
import choice from './choice.module.css';
import styles from './RustFix.module.css';

const quote = (lines: string[]) => `“${lines.map((l) => l.trim()).join(' ')}”`;

/** Read rustc's complaint, then pick the change that fixes it. Diff signs are glyphs, not just color. */
export function RustFix({ question: q, answer, act }: RendererProps<RustFixQuestion>) {
  return (
    <>
      <OutputPanel error={q.error} />
      <CodePanel lines={q.code} lang="rust" label="Rust code" />
      <div className={choice.list} role="group" aria-label="Fixes">
        {q.opts.map((o, i) => {
          const letter = String.fromCharCode(65 + i);
          const t = tone(answer.sel === i, i === q.answer, answer.checked);
          const { remove, add } = parseDiff(o.diff);
          return (
            <button
              key={i}
              type="button"
              className={`${toneStyles.tile} ${toneStyles[t]} ${choice.tile}`}
              aria-pressed={answer.sel === i}
              aria-label={`Option ${letter}: change ${quote(remove)} to ${quote(add)}${toneLabel(t)}`}
              onClick={() => act({ type: 'select', sel: i })}
            >
              <span className={choice.letter}>{letter}</span>
              <span className={styles.diff}>
                {remove.map((line, j) => (
                  <span key={`-${j}`} className={styles.del}>
                    <span className={styles.sign}>−</span>
                    {line.trim()}
                  </span>
                ))}
                {add.map((line, j) => (
                  <span key={`+${j}`} className={styles.add}>
                    <span className={styles.sign}>+</span>
                    {line.trim()}
                  </span>
                ))}
              </span>
              <ToneMark tone={t} />
            </button>
          );
        })}
      </div>
    </>
  );
}
```
`src/quiz/renderers/rust/RustFix.module.css`:
```css
.diff {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-grow: 1;
  min-width: 0;
  padding: 8px 10px;
  background: var(--ink);
  border-radius: 8px;
  font-family: var(--font-code);
  font-size: 13px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.del {
  color: var(--code-del);
}

.add {
  color: var(--code-add);
}

.sign {
  display: inline-block;
  width: 2ch;
  font-weight: 700;
}
```
`src/quiz/renderers/rust/RustQuestionBody.tsx`:
```tsx
import type { RustQuestion } from '../../../content';
import type { RendererProps } from '../types';
import { RustCompiles } from './RustCompiles';
import { RustFix } from './RustFix';
import { RustPredict } from './RustPredict';

export function RustQuestionBody({ question, answer, act }: RendererProps<RustQuestion>) {
  switch (question.type) {
    case 'rs-predict':
      return <RustPredict question={question} answer={answer} act={act} />;
    case 'rs-compiles':
      return <RustCompiles question={question} answer={answer} act={act} />;
    case 'rs-fix':
      return <RustFix question={question} answer={answer} act={act} />;
    default:
      return null; // rs-pairs, rs-build, rs-error, rs-type: see the following renderer commits
  }
}
```
In `src/quiz/renderers/QuestionBody.tsx`, import `RustQuestionBody` from `'./rust/RustQuestionBody'` and replace the `return null` line with:
```tsx
  if (isRustQuestion(question)) return <RustQuestionBody question={question} answer={answer} act={act} />;
```

- [ ] **Step 5: Run the tests**

Run: `npm run typecheck && npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/quiz/renderers
git commit -m "Add Rust Predict the output, Compiles? and Fix it renderers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---

### Task 13: Rust renderers II: Spot the error and Type the token

**Files:**
- Create: `src/quiz/renderers/LinePicker.tsx`, `src/quiz/renderers/rust/RustError.tsx` + `.test.tsx`, `src/quiz/renderers/rust/RustType.tsx` + `.module.css` + `.test.tsx`
- Move: `src/quiz/renderers/css/Bug.module.css` → `src/quiz/renderers/LinePicker.module.css`
- Modify: `src/quiz/renderers/css/Bug.tsx`, `src/quiz/renderers/rust/RustQuestionBody.tsx`, `src/components/CodePanel.tsx` + `.module.css`, `src/quiz/session.ts`

**Interfaces:**
- Consumes: `CodeTokens` with `lang`, `visibleLines`, `BLANK`, `TOKEN_MAX_LENGTH` (Task 7).
- Produces: `LinePicker({ lines, lang, answer, state, act })`; `CodePanel` prop `blank?: string` (renders the `___` blank as `<mark data-testid="code-blank">`); session caps `rs-type` input at 40 characters; `RustError`, `RustType`.

- [ ] **Step 1: Write the failing tests**

`src/quiz/renderers/rust/RustError.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-error-1: line 5 uses `v` after line 3 moved it
describe('Spot the error (Rust)', () => {
  it('picks a line and reveals rustc’s line and message when wrong', async () => {
    const { user } = renderQuiz('rs-error', {}, 0, 'rust');
    const line3 = screen.getByRole('button', { name: 'Line 3: let w = v;' });
    await user.click(line3);
    expect(line3).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('Not that one — it’s line 5');
    expect(sheet).toHaveTextContent('error[E0382]: borrow of moved value: `v`');
    expect(screen.getByRole('button', { name: 'Line 5: println!("{}", v.len());, correct answer' })).toBeInTheDocument();
    expect(screen.getByText('4 hearts left')).toBeInTheDocument();
  });
});
```
`src/quiz/renderers/rust/RustType.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-type-1 accepts "&mut" (and "& mut")
describe('Type the token (Rust)', () => {
  it('shows the typed token in the code and accepts messy spacing', async () => {
    const { user } = renderQuiz('rs-type', {}, 0, 'rust');
    const input = screen.getByLabelText('Missing token');
    expect(input).toHaveAttribute('maxlength', '40');
    expect(screen.getByTestId('code-blank')).toHaveTextContent('___');
    await user.type(input, '  &mut ');
    expect(screen.getByTestId('code-blank')).toHaveTextContent('&mut');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
  });

  it('is case-sensitive', async () => {
    const { user } = renderQuiz('rs-type', {}, 0, 'rust');
    await user.type(screen.getByLabelText('Missing token'), '&MUT');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Answer: &mut');
  });

  it('caps input at 40 characters even when maxlength is bypassed', async () => {
    const { user } = renderQuiz('rs-type', {}, 0, 'rust');
    const input = screen.getByLabelText('Missing token');
    input.removeAttribute('maxlength');
    await user.click(input);
    await user.paste('x'.repeat(50));
    expect(input).toHaveValue('x'.repeat(40));
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/quiz/renderers/rust`
Expected: the new tests FAIL; the Task 12 tests still pass.

- [ ] **Step 3: Extract `LinePicker` from CSS Bug**

```bash
git mv src/quiz/renderers/css/Bug.module.css src/quiz/renderers/LinePicker.module.css
```
Create `src/quiz/renderers/LinePicker.tsx`:
```tsx
import { CodeTokens, type CodeLang } from '../../components/CodePanel';
import type { SessionAction } from '../session';
import { tone, toneLabel } from '../tone';
import { ToneMark } from '../ToneMark';
import type { AnswerState } from '../types';
import styles from './LinePicker.module.css';

interface Props {
  /** Displayed lines; the picked line number is the 1-based index into these. */
  lines: readonly string[];
  lang: CodeLang;
  /** The correct 1-based line. */
  answer: number;
  state: AnswerState;
  act: (action: SessionAction) => void;
}

/** Numbered code lines as tappable buttons (Spot the bug, Spot the error). */
export function LinePicker({ lines, lang, answer, state, act }: Props) {
  return (
    <div className={styles.lines} role="group" aria-label="Code lines">
      {lines.map((line, i) => {
        const n = i + 1;
        const t = tone(state.sel === n, n === answer, state.checked);
        return (
          <button
            key={n}
            type="button"
            className={`${styles.line} ${styles[t]}`}
            aria-pressed={state.sel === n}
            aria-label={`Line ${n}: ${line.trim()}${toneLabel(t)}`}
            onClick={() => act({ type: 'select', sel: n })}
          >
            <span className={styles.num} aria-hidden="true">
              {n}
            </span>
            <span className={styles.code}>
              <CodeTokens line={line} lang={lang} />
            </span>
            <ToneMark tone={t} />
          </button>
        );
      })}
    </div>
  );
}
```
In `src/quiz/renderers/css/Bug.tsx`, remove the imports of `CodeTokens`, `tone`, `toneLabel`, `ToneMark` and `./Bug.module.css`, import `LinePicker` from `'../LinePicker'`, and replace the whole `<div className={styles.lines} …>…</div>` block with:
```tsx
      <LinePicker lines={q.code} lang="css" answer={q.answer} state={answer} act={act} />
```
Run `npx vitest run src/quiz/renderers/css/Bug.test.tsx`. Expected: PASS unchanged.

- [ ] **Step 4: Show a live blank in `CodePanel`**

In `src/components/CodePanel.tsx`:
- Import `BLANK` alongside `visibleLines`.
- Add the prop `blank?: string` to `CodePanel` (doc comment: `/** rs-type: text shown in the \`___\` blank (the blank itself while empty). */`), and render `<LineContent line={line} lang={lang} blank={blank} />` in place of `<CodeTokens line={line} lang={lang} />`.
- Add:
  ```tsx
  function LineContent({ line, lang, blank }: { line: string; lang: CodeLang; blank?: string }) {
    const at = blank === undefined ? -1 : line.indexOf(BLANK);
    if (at === -1) return <CodeTokens line={line} lang={lang} />;
    return (
      <>
        <CodeTokens line={line.slice(0, at)} lang={lang} />
        <mark className={styles.blank} data-testid="code-blank">
          {blank || BLANK}
        </mark>
        <CodeTokens line={line.slice(at + BLANK.length)} lang={lang} />
      </>
    );
  }
  ```
Append to `src/components/CodePanel.module.css`:
```css
/* --code-value on #34305a is 8.8:1. */
.blank {
  padding: 0 4px;
  border-bottom: 2px solid var(--code-value);
  border-radius: 4px;
  background: #34305a;
  color: var(--code-value);
  font-weight: 700;
}
```

- [ ] **Step 5: Cap typed Rust tokens in the session**

In `src/quiz/session.ts`, import `TOKEN_MAX_LENGTH` from `'../lib/rustCode'` and replace `case 'input':` with:
```ts
    case 'input': {
      if (a.checked) return s;
      // rs-type input is capped even if the input's maxlength is bypassed (e.g. a paste from a script).
      return withAnswer(s, { val: q.type === 'rs-type' ? action.val.slice(0, TOKEN_MAX_LENGTH) : action.val });
    }
```

- [ ] **Step 6: Implement the renderers**

`src/quiz/renderers/rust/RustError.tsx`:
```tsx
import type { RustErrorQuestion } from '../../../content';
import { visibleLines } from '../../../lib/rustCode';
import { LinePicker } from '../LinePicker';
import type { RendererProps } from '../types';

/** Tap the line rustc rejects. Line numbers count visible lines only. */
export function RustError({ question: q, answer, act }: RendererProps<RustErrorQuestion>) {
  return <LinePicker lines={visibleLines(q.code)} lang="rust" answer={q.answer} state={answer} act={act} />;
}
```
`src/quiz/renderers/rust/RustType.tsx`:
```tsx
import { useId } from 'react';
import type { RustTypeQuestion } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { TOKEN_MAX_LENGTH } from '../../../lib/rustCode';
import type { RendererProps } from '../types';
import styles from './RustType.module.css';

/** Free recall: type the missing token. The code shows it in place as you type (as text, never markup). */
export function RustType({ question: q, answer, act }: RendererProps<RustTypeQuestion>) {
  const inputId = useId();
  return (
    <>
      <CodePanel lines={q.code} lang="rust" label="Rust code" blank={answer.val} />
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          Missing token
        </label>
        <input
          id={inputId}
          className={styles.input}
          type="text"
          value={answer.val}
          maxLength={TOKEN_MAX_LENGTH}
          disabled={answer.checked}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => act({ type: 'input', val: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              act({ type: 'check' });
            }
          }}
        />
      </div>
      <p className={styles.help}>No options this time — type it from memory. Press Enter to check.</p>
    </>
  );
}
```
`src/quiz/renderers/rust/RustType.module.css`:
```css
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-muted);
}

/* 16px text stops iOS from zooming on focus. */
.input {
  height: var(--touch);
  padding: 0 12px;
  border: 2px solid var(--line-strong);
  border-radius: var(--radius-chip);
  background: var(--surface);
  color: var(--ink);
  font-family: var(--font-code);
  font-size: 16px;
}

.help {
  font-size: 14px;
  color: var(--ink-muted);
}
```
In `RustQuestionBody.tsx`, import both and add before `default:`:
```tsx
    case 'rs-error':
      return <RustError question={question} answer={answer} act={act} />;
    case 'rs-type':
      return <RustType question={question} answer={answer} act={act} />;
```
and update the `default` comment to `// rs-pairs, rs-build: see the next renderer commit`.

- [ ] **Step 7: Run everything**

Run: `npm run typecheck && npm test`
Expected: all PASS (including the unchanged CSS Bug tests).

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "Add Rust Spot the error and Type the token renderers; share LinePicker with Bug

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---

### Task 14: Rust renderers III: Word bank and Match pairs

**Files:**
- Create: `src/quiz/renderers/WordBank.tsx` + `.module.css`, `src/quiz/renderers/PairBoard.tsx` + `.module.css`, `src/quiz/renderers/rust/RustBuild.tsx` + `.module.css` + `.test.tsx`, `src/quiz/renderers/rust/RustPairs.tsx` + `.module.css` + `.test.tsx`
- Modify: `src/quiz/renderers/css/Build.tsx` + `.module.css`, `src/quiz/renderers/css/Pairs.tsx` + `.module.css`, `src/quiz/renderers/rust/RustQuestionBody.tsx`

**Interfaces:**
- Consumes: `isHiddenLine`, `OutputPanel`, `CodeTokens` (Task 7); `PAIR_MISS_FLASH_MS`.
- Produces: `WordBank({ bank, slots, checked, act })`, `SlotButton({ n, word, checked, onClear })`, `PairBoard({ ids, order, answer, act, leftLabel, rightLabel, left, right })` with `interface PairFace { label: string; content: ReactNode; className?: string }`, `RustBuild`, `RustPairs`; `RustQuestionBody` becomes exhaustive.

- [ ] **Step 1: Write the failing tests**

`src/quiz/renderers/rust/RustBuild.test.tsx`:
```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-build-1: slot 1 takes "&String", slot 2 takes "&name"
describe('Word bank (Rust)', () => {
  it('fills inline blanks, grades them, then shows what the program prints', async () => {
    const { user } = renderQuiz('rs-build', {}, 0, 'rust');
    expect(screen.getByRole('button', { name: 'Blank 1, empty' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '&String' }));
    await user.click(screen.getByRole('button', { name: '&name' }));
    expect(screen.getByRole('button', { name: 'Blank 2: &name. Tap to remove' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '&name, placed' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Output' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
    expect(screen.getByRole('region', { name: 'Output' })).toHaveTextContent('ferris FERRIS');
  });

  it('gives the answer words when wrong', async () => {
    const { user } = renderQuiz('rs-build', {}, 0, 'rust');
    await user.click(screen.getByRole('button', { name: 'String' }));
    await user.click(screen.getByRole('button', { name: 'name' }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Answer: &String, &name');
  });
});
```
`src/quiz/renderers/rust/RustPairs.test.tsx`:
```tsx
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderQuiz } from '../../testUtils';

const PAIRS: [string, string][] = [
  ['String', 'Owned, growable text'],
  ['&String', 'Shared borrow, read-only'],
  ['&mut String', 'Exclusive borrow, can change it'],
  ['s.clone()', 'A deep copy with its own owner'],
];
const btn = (name: string) => screen.getByRole('button', { name });

describe('Match pairs (Rust)', () => {
  // Same timer setup as the CSS pairs test: shouldAdvanceTime keeps RTL's async helpers moving.
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('matches code to meaning without Check or hearts, then reports mismatches', async () => {
    const { user } = renderQuiz('rs-pairs', { advanceTimers: vi.advanceTimersByTime }, 0, 'rust');
    expect(screen.getByText('Tap a code item, then its meaning.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Code' })).toBeInTheDocument();

    await user.click(btn('String'));
    await user.click(btn('Shared borrow, read-only'));
    expect(btn('String, not a match')).toBeInTheDocument();
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(700);
    });

    for (const [left, right] of PAIRS) {
      await user.click(btn(left));
      await user.click(btn(right));
    }
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('All pairs matched!');
    expect(sheet).toHaveTextContent('1 mismatch along the way.');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/quiz/renderers/rust`
Expected: the two new files FAIL.

- [ ] **Step 3: Extract `WordBank` and `SlotButton` from CSS Build**

Create `src/quiz/renderers/WordBank.tsx`:
```tsx
import type { SessionAction } from '../session';
import styles from './WordBank.module.css';

/** Bank chips, tracked by index so the bank may repeat words. A placed chip leaves a ghost so the bank doesn't reflow. */
export function WordBank(props: {
  bank: readonly string[];
  slots: readonly (number | null)[];
  checked: boolean;
  act: (action: SessionAction) => void;
}) {
  const { bank, slots, checked, act } = props;
  return (
    <div className={styles.bank} role="group" aria-label="Word bank">
      {bank.map((word, ci) => {
        const used = slots.includes(ci);
        return (
          <button
            key={ci}
            type="button"
            className={used ? styles.used : styles.chip}
            disabled={used || checked}
            aria-label={used ? `${word}, placed` : word}
            onClick={() => act({ type: 'placeWord', bankIndex: ci })}
          >
            {word}
          </button>
        );
      })}
    </div>
  );
}

/** A blank in the code. Tapping a filled blank sends its word back to the bank. */
export function SlotButton({ n, word, checked, onClear }: { n: number; word: string | null; checked: boolean; onClear: () => void }) {
  return (
    <button
      type="button"
      className={word ? styles.filled : styles.empty}
      disabled={checked}
      aria-label={word ? `Blank ${n}: ${word}. Tap to remove` : `Blank ${n}, empty`}
      onClick={onClear}
    >
      {word}
    </button>
  );
}
```
Create `src/quiz/renderers/WordBank.module.css` by **moving** these rule blocks out of `src/quiz/renderers/css/Build.module.css`, unchanged: `.empty, .filled`, `.empty`, `.filled`, `.bank`, `.chip, .used`, `.chip`, and the `/* A placed chip leaves a ghost… */ .used` block.

In `src/quiz/renderers/css/Build.tsx`, import `{ SlotButton, WordBank }` from `'../WordBank'`. Replace the slot `<button>…</button>` with:
```tsx
              <SlotButton n={n} word={word} checked={answer.checked} onClear={() => act({ type: 'clearSlot', slot: line.slot })} />
```
and the whole `<div className={styles.bank} …>…</div>` with:
```tsx
      <WordBank bank={q.bank} slots={answer.slots} checked={answer.checked} act={act} />
```
Run `npx vitest run src/quiz/renderers/css/Build.test.tsx`. Expected: PASS unchanged.

- [ ] **Step 4: Extract `PairBoard` from CSS Pairs**

Create `src/quiz/renderers/PairBoard.tsx`:
```tsx
import { useEffect, type ReactNode } from 'react';
import { PAIR_MISS_FLASH_MS } from '../../state/rules';
import type { SessionAction } from '../session';
import { ToneMark } from '../ToneMark';
import toneStyles from '../tone.module.css';
import type { AnswerState } from '../types';
import styles from './PairBoard.module.css';

type PairTone = 'idle' | 'selected' | 'wrong' | 'done';

function pairTone(a: AnswerState, id: string, side: 'left' | 'right'): PairTone {
  if (a.matched[id]) return 'done';
  if (a.miss?.[side] === id) return 'wrong';
  if (a[side] === id) return 'selected';
  return 'idle';
}

const SUFFIX: Record<PairTone, string> = { idle: '', selected: '', wrong: ', not a match', done: ', matched' };

/** What one tile shows. `label` is its accessible name (before the match-state suffix). */
export interface PairFace {
  label: string;
  content: ReactNode;
  className?: string;
}

interface Props {
  /** Left column, top to bottom. */
  ids: readonly string[];
  /** Right column, top to bottom. */
  order: readonly string[];
  answer: AnswerState;
  act: (action: SessionAction) => void;
  leftLabel: string;
  rightLabel: string;
  left: (id: string) => PairFace;
  right: (id: string) => PairFace;
}

/** Tap a tile on each side to match them. Checks every pair; never costs hearts. */
export function PairBoard({ ids, order, answer, act, leftLabel, rightLabel, left, right }: Props) {
  // Clear the mismatch highlight after a moment. A newer pick clears `miss`
  // first, which cancels this timer.
  useEffect(() => {
    if (!answer.miss) return;
    const timer = setTimeout(() => act({ type: 'clearMiss' }), PAIR_MISS_FLASH_MS);
    return () => clearTimeout(timer);
  }, [answer.miss, act]);

  const column = (side: 'left' | 'right', list: readonly string[], face: (id: string) => PairFace, label: string) => (
    <div className={styles.column} role="group" aria-label={label}>
      {list.map((id) => {
        const t = pairTone(answer, id, side);
        const f = face(id);
        return (
          <button
            key={id}
            type="button"
            className={`${toneStyles.tile} ${t === 'done' ? styles.done : toneStyles[t]} ${styles.tile} ${f.className ?? ''}`}
            disabled={t === 'done'}
            aria-pressed={t === 'selected'}
            aria-label={`${f.label}${SUFFIX[t]}`}
            onClick={() => act({ type: 'pickPair', side, id })}
          >
            {f.content}
            <ToneMark tone={t === 'done' ? 'correct' : t === 'wrong' ? 'wrong' : 'idle'} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={styles.columns}>
      {column('left', ids, left, leftLabel)}
      {column('right', order, right, rightLabel)}
    </div>
  );
}
```
Create `src/quiz/renderers/PairBoard.module.css` by **moving** `.columns`, `.column`, `.tile` and `.tile.done` out of `src/quiz/renderers/css/Pairs.module.css`, unchanged. `Pairs.module.css` keeps only `.code`.

Replace `src/quiz/renderers/css/Pairs.tsx` with:
```tsx
import type { PairsQuestion } from '../../../content';
import { CssBox } from '../../../components/CssBox';
import { PairBoard } from '../PairBoard';
import type { RendererProps } from '../types';
import styles from './Pairs.module.css';

/** Tap a property, then what it draws. */
export function Pairs({ question: q, answer, act }: RendererProps<PairsQuestion>) {
  const byId = new Map(q.items.map((it) => [it.id, it]));
  return (
    <PairBoard
      ids={q.items.map((it) => it.id)}
      order={q.order}
      answer={answer}
      act={act}
      leftLabel="Properties"
      rightLabel="Results"
      left={(id) => ({ label: byId.get(id)!.code, content: byId.get(id)!.code, className: styles.code })}
      right={(id) => {
        const it = byId.get(id)!;
        return { label: it.label, content: <CssBox css={it.shape}>{it.text}</CssBox> };
      }}
    />
  );
}
```
Run `npx vitest run src/quiz/renderers/css/Pairs.test.tsx`. Expected: PASS unchanged.

- [ ] **Step 5: Implement the Rust renderers**

`src/quiz/renderers/rust/RustBuild.tsx`:
```tsx
import type { RustBuildQuestion } from '../../../content';
import { CodeTokens } from '../../../components/CodePanel';
import { OutputPanel } from '../../../components/OutputPanel';
import { isHiddenLine } from '../../../lib/rustCode';
import type { RendererProps } from '../types';
import { SlotButton, WordBank } from '../WordBank';
import styles from './RustBuild.module.css';

/** Fill inline blanks from a word bank. After Check, show what the finished program prints. */
export function RustBuild({ question: q, answer, act }: RendererProps<RustBuildQuestion>) {
  const words = answer.slots.map((ci) => (ci === null ? null : (q.bank[ci] ?? null)));
  return (
    <>
      <div className={styles.code} role="group" aria-label="Rust code">
        {q.code.map((line, i) => {
          if (typeof line === 'string') {
            if (isHiddenLine(line)) return null;
            return (
              <div key={i} className={styles.line}>
                <CodeTokens line={line} lang="rust" />
              </div>
            );
          }
          return (
            <div key={i} className={styles.line}>
              {line.map((seg, j) =>
                typeof seg === 'string' ? (
                  <CodeTokens key={j} line={seg} lang="rust" />
                ) : (
                  <SlotButton
                    key={j}
                    n={seg.slot + 1}
                    word={words[seg.slot] ?? null}
                    checked={answer.checked}
                    onClear={() => act({ type: 'clearSlot', slot: seg.slot })}
                  />
                ),
              )}
            </div>
          );
        })}
      </div>
      <WordBank bank={q.bank} slots={answer.slots} checked={answer.checked} act={act} />
      {answer.checked && q.output && <OutputPanel output={q.output} />}
    </>
  );
}
```
`src/quiz/renderers/rust/RustBuild.module.css`:
```css
.code {
  padding: 10px 14px;
  background: var(--ink);
  border-radius: var(--radius-tile);
  font-family: var(--font-code);
  font-size: 13px;
  line-height: 1.7;
  color: var(--code-punct);
  overflow-x: auto;
}

/* Wraps at 390px so slots never force a horizontal page scroll. */
.line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-height: 1.7em;
  white-space: pre;
}
```
`src/quiz/renderers/rust/RustPairs.tsx`:
```tsx
import type { RustPairsQuestion } from '../../../content';
import { PairBoard } from '../PairBoard';
import type { RendererProps } from '../types';
import styles from './RustPairs.module.css';

/** Tap a piece of code, then what it means. Code is plain monospace: the syntax colors are for dark panels. */
export function RustPairs({ question: q, answer, act }: RendererProps<RustPairsQuestion>) {
  const byId = new Map(q.items.map((it) => [it.id, it]));
  return (
    <PairBoard
      ids={q.items.map((it) => it.id)}
      order={q.order}
      answer={answer}
      act={act}
      leftLabel="Code"
      rightLabel="Meanings"
      left={(id) => ({ label: byId.get(id)!.left, content: byId.get(id)!.left, className: styles.code })}
      right={(id) => ({ label: byId.get(id)!.right, content: byId.get(id)!.right, className: styles.meaning })}
    />
  );
}
```
`src/quiz/renderers/rust/RustPairs.module.css`:
```css
.code {
  font-family: var(--font-code);
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.meaning {
  font-size: 14px;
  line-height: 1.3;
  text-align: center;
}
```
Make `RustQuestionBody.tsx` exhaustive: import both, add
```tsx
    case 'rs-pairs':
      return <RustPairs question={question} answer={answer} act={act} />;
    case 'rs-build':
      return <RustBuild question={question} answer={answer} act={act} />;
```
and **delete the `default:` branch**, so a new Rust type without a renderer fails `tsc`.

- [ ] **Step 6: Run everything**

Run: `npm run typecheck && npm test`
Expected: all PASS, with CSS Build and Pairs tests unchanged.

- [ ] **Step 7: Look at it**

Run `npm run dev` at 390×844, pick Rust, and play Practice → "Mixed review". Check that:
- No screen scrolls horizontally.
- Word-bank lines wrap cleanly.
- Diff tiles stay readable.
- The Compiles? tiles fit two snippets without clipping.

- [ ] **Step 8: Commit**

```bash
git add src/quiz/renderers
git commit -m "Add Rust Word bank and Match pairs renderers; share WordBank and PairBoard with CSS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

---

### Task 15: Rust smoke test and docs

**Files:**
- Create: `e2e/rust.spec.ts`
- Modify: `README.md`, `CLAUDE.md`, `docs/content-schema.md`, `docs/design-rationale.md`, `docs/design-tokens.md`, `docs/superpowers/specs/2026-09-26-css-curriculum-design.md`

**Interfaces:**
- Consumes: the whole app.
- Produces: documentation matching the code; an e2e test of the Rust course.

- [ ] **Step 1: Write the Rust smoke test**

Create `e2e/rust.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('learn Ownership in Rust, practice it, and keep XP across courses', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Rust,/ }).click();
  await expect(page.getByText('Rust, one tap at a time')).toBeVisible();

  // Learn: a code demo, then an rs-choice demo that swaps the compiler's verdict.
  await page.getByRole('button', { name: 'Ownership & moves, 5 cards' }).click();
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText('Every value has one owner');
  await expect(page.getByRole('region', { name: 'Output' })).toContainText('hi');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(h1).toHaveText('Assignment moves');
  await expect(page.getByRole('region', { name: 'Compiler error' })).toContainText('E0382');
  await page.getByRole('button', { name: 's.clone()', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Output' })).toContainText('hi hi');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Practice this' }).click();

  const feedback = page.getByRole('region', { name: 'Feedback' });
  const check = page.getByRole('button', { name: 'Check' });
  const cont = page.getByRole('button', { name: 'Continue' });

  // rs-predict-1: right first time (+10)
  await page.getByRole('button', { name: /^Option A:/ }).click();
  await check.click();
  await expect(feedback).toContainText('Nice — that’s right!');
  await cont.click();

  // rs-pairs-1: no Check, completes itself (+10)
  for (const [left, right] of [
    ['String', 'Owned, growable text'],
    ['&String', 'Shared borrow, read-only'],
    ['&mut String', 'Exclusive borrow, can change it'],
    ['s.clone()', 'A deep copy with its own owner'],
  ]) {
    await page.getByRole('button', { name: left, exact: true }).click();
    await page.getByRole('button', { name: right, exact: true }).click();
  }
  await expect(feedback).toContainText('All pairs matched!');
  await cont.click();

  // rs-compiles-1: wrong — costs a heart, shows rustc, comes back at the end
  await page.getByRole('button', { name: 'Snippet A' }).click();
  await check.click();
  await expect(feedback).toContainText('Answer: B');
  await expect(feedback).toContainText('rustc says');
  await expect(page.getByText('4 hearts left')).toBeAttached();
  await cont.click();

  // rs-build-1 (+10), then the program's output
  await page.getByRole('button', { name: '&String', exact: true }).click();
  await page.getByRole('button', { name: '&name', exact: true }).click();
  await check.click();
  await expect(page.getByRole('region', { name: 'Output' })).toContainText('ferris FERRIS');
  await cont.click();

  // rs-error-1 (+10)
  await page.getByRole('button', { name: /^Line 5:/ }).click();
  await check.click();
  await cont.click();

  // rs-fix-1 (+10)
  await page.getByRole('button', { name: /^Option A:/ }).click();
  await check.click();
  await cont.click();

  // rs-type-1 (+10), checked with Enter
  await page.getByLabel('Missing token').fill('&mut');
  await page.keyboard.press('Enter');
  await expect(feedback).toBeVisible();
  await cont.click();

  // rs-compiles-1 again: right after a miss (+5)
  await page.getByRole('button', { name: 'Snippet B' }).click();
  await check.click();
  await cont.click();

  await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
  await expect(page.getByText('+65')).toBeVisible();
  await expect(page.getByText('86%')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('65 XP')).toBeVisible();

  // Progress is per course; the header XP is global.
  await page.getByRole('button', { name: 'Rust, change course' }).click();
  await expect(page.getByRole('button', { name: 'Rust, 1 of 1 units, 65 XP, current' })).toBeVisible();
  await page.getByRole('button', { name: /^CSS,/ }).click();
  await expect(page.getByText('Start here')).toBeVisible();
  await expect(page.getByText('65 XP')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'CSS, change course' })).toBeVisible();
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `npx playwright test`
Expected: 4 test files, all PASS. If a step fails on timing (the 350 ms Check/Continue guard), don't add waits. Check the button is found by the right name first: Playwright already waits for `aria-disabled` to clear.

- [ ] **Step 3: Update the docs**

`README.md`: replace everything above `## Develop` with:
```markdown
# Cascade

A Duolingo-style mobile app for learning to code, one course at a time: short **Learn** lessons with live playgrounds, then bite-sized **Practice** quizzes. 5 hearts per lesson, missed questions come back at the end, XP for first-try answers.

| Course | Learn | Practice |
|---|---|---|
| CSS | 5 units, 19 cards, knob and choice playgrounds drawn with real CSS | 22 questions in 7 types: Predict the render, Match pairs, Which rule wins?, Word bank, Tune to target, Spot the bug, Type the value |
| Rust | 1 unit (Ownership & moves), 5 cards with code and choice demos | 7 questions in 7 types: Predict the output, Match pairs, Compiles?, Word bank, Spot the error, Fix it, Type the token |

Start with `CLAUDE.md`.
```
and replace the `## Develop` list and the storage line with:
```markdown
## Develop

- `npm run dev` — start the app (Vite).
- `npm test` — unit and component tests (Vitest).
- `npm run test:e2e` — browser tests (Playwright; first run `npx playwright install chromium`).
- `npm run typecheck` — TypeScript for the app and `scripts/`.
- `npm run check:rust` — compile every Rust snippet in `content/rust` with the toolchain pinned in `rust-toolchain.toml` and check it against its authored output or error.
- `npm run build` — type-check and build to `dist/`.

CI (`.github/workflows/ci.yml`) runs all of the above on pushes to `main` and on pull requests.

Progress (active course; per course: completed units, practice sets, XP) is stored in `localStorage` under `cascade.progress.v2`. Progress from before courses existed (`cascade.progress.v1`) is migrated into the CSS course on first load.
```

`CLAUDE.md`:
- Title: `# Cascade — a Duolingo-style app for learning to code`.
- Replace the first paragraph ("This folder is a **handoff**…") with: `A multi-course learning app (CSS and Rust so far). It started as a handoff from a CSS design prototype; the prototype in reference/ is still the source of truth for shared behavior (quiz engine, hearts, XP, feedback).`
- In the "What exists" table, replace the four `content/*.json` rows with:
  ```markdown
  | `content/courses.json` | The course list, in picker order (`id`, `name`, `tagline`, `blurb`, `icon`). |
  | `content/<course>/lessons.json` | Units and cards. CSS cards may have knob/choice playgrounds; Rust cards may have `code`/`rs-choice` demos. |
  | `content/<course>/questions.json` | Practice questions. CSS: 7 types drawn with real CSS. Rust: 7 `rs-*` types. |
  | `content/<course>/question-types.json` | That course's question types in difficulty order. |
  | `content/<course>/topics.json` | Unit key → question ids for its "Practice this" quiz. |
  | `scripts/check-rust.ts` | `npm run check:rust`: compiles Rust content against its authored answers. |
  ```
- Delete the "Suggested stack" and "Build order" sections (they are done). In their place add:
  ```markdown
  ## Stack

  Vite + React + TypeScript, CSS Modules with the tokens in `docs/design-tokens.md`, Vitest, Playwright, GitHub Actions. Content is typed JSON behind `src/content` (`courseById`, `unitByKey(course, …)`, …); components never import JSON.

  ## Adding a course

  1. Add its id to `COURSE_IDS` and its question-type keys to `TYPE_KEYS` in `src/content/typeKeys.ts`.
  2. Add `content/<id>/` (four files) and an entry in `content/courses.json`, and bundle it in `src/content/index.ts`.
  3. Add its question shapes to `src/content/types.ts`, a validator, a grader (`src/quiz/grade/`), feedback copy (`src/quiz/feedback/`) and renderers (`src/quiz/renderers/<id>/`). Exhaustive switches make `tsc` point at anything missing.
  ```
- Split "Rules" into three headings:
  - `## Rules (all courses)`: the accessibility, reduced-motion and "content stays in JSON" bullets.
  - `## CSS course`: the sanitizing bullet, the `§` HTML-line note, and "live previews are real CSS from question data, never images".
  - `## Rust course`: new. Bullets:
    - "Answers are authored data; nothing runs Rust in the app."
    - "Every snippet must pass `npm run check:rust` (CI enforces it)."
    - "Lines starting with `# ` are hidden setup (rustdoc convention), and displayed line numbers count visible lines only."
    - "Errors are written as rustc's first line: `error[E0382]: …`."
    - "Typed tokens are trimmed, whitespace-collapsed, case-sensitive, and at most 40 characters."
- In "Open questions", delete the "Stack confirmation" and "working title" bullets. Keep "Accounts/sync, streaks, and a lesson map are not designed yet", and add "The full Rust curriculum (12–15 units) is the next spec."

`docs/content-schema.md`: change the opening paragraph to say the schema is per course, with CSS-specific notes marked. Then append:
````markdown
## courses.json — `CourseInfo[]` (picker order)

```ts
type CourseInfo = { id: 'css' | 'rust'; name: string; tagline: string; blurb: string; icon: 'css' | 'rust' };
```
Each listed course has a folder `content/<id>/` with the four files below.

## Rust courses

Code arrays are plain Rust. A line starting with `# ` (or exactly `#`) is hidden setup: compiled by `npm run check:rust`, never shown (rustdoc's convention). Displayed line numbers count visible lines only. `error` strings are rustc's first error line, e.g. `` error[E0382]: borrow of moved value: `s` ``.

### Demos
```ts
type CodeDemo = { kind: 'code'; code: string[]; output?: string[]; error?: string };        // at most one of output/error
type RustChoiceDemo = { kind: 'rs-choice'; label: string; start?: number;
  opts: { label: string; code: string[]; output?: string[]; error?: string; note?: string }[] }; // exactly one of output/error
```

### Questions
```ts
{ type: 'rs-predict'; code: string[]; opts: { text: string; kind: 'output' | 'error' }[]; answer: number; error?: string } // error iff answer is the error option
{ type: 'rs-pairs'; items: { id: string; left: string; right: string }[]; order: string[] }                                   // 4 items
{ type: 'rs-compiles'; a: string[]; b: string[]; answer: 'a' | 'b'; error: string }                                         // error = what rustc says about the other
{ type: 'rs-build'; code: (string | (string | { slot: number })[])[]; bank: string[]; answer: string[]; output?: string[] } // inline slots
{ type: 'rs-error'; code: string[]; answer: number; error: string }                                                         // answer = visible line
{ type: 'rs-fix'; code: string[]; error: string; opts: { diff: string[] }[]; answer: number }                               // diff: "- old" lines (contiguous in code), then "+ new"
{ type: 'rs-type'; code: string[]; accept: string[] }                                                                       // one ___ blank; accept is normalized
```
````

`docs/design-rationale.md`: append:
```markdown
## Rust course

The Rust course reuses the game loop and swaps the CSS "see it render" previews for "see what the compiler says". Answers are authored and verified by `npm run check:rust`, so the app stays offline and deterministic.

| Type | Why |
|---|---|
| Predict the output | Reading code and tracing values is the first skill; a "Doesn't compile" option trains the reflex that ownership errors are compile-time. |
| Match pairs | Cheap vocabulary drill (`&T`, `&mut T`, `clone()`), never costs hearts. |
| Compiles? | Two near-identical snippets isolate one ownership/borrowing rule — the Rust counterpart of "Which rule wins?". |
| Word bank | Production with scaffolding; showing the program's output afterwards closes the loop. |
| Spot the error | Learners meet rustc's errors daily; finding the line rustc points at builds the habit of reading diagnostics. |
| Fix it | The real-world follow-up to an error: choose the idiomatic fix, not just any change. |
| Type the token | Free recall of the small tokens that carry meaning (`&mut`, `?`, `'a`). |

"Tune to target" has no Rust counterpart: it trains a visual eye for spacing.
```

`docs/design-tokens.md`: under the code-syntax colors, add the Rust token lines from `src/styles/tokens.css` (`--code-keyword` … `--code-del`), each with its contrast ratio on `--ink`.

`docs/superpowers/specs/2026-09-26-css-curriculum-design.md`: under the `Scope:` line, add:
```markdown
Paths: since the multi-course change (`2026-09-26-multi-course-rust-design.md`), CSS content lives in `content/css/`, and unit/question lookups take the course (`unitByKey(course, key)`).
```

- [ ] **Step 4: Final verification**

Run: `npm run typecheck && npm test && npm run build && npm run check:rust && npx playwright test`
Expected: everything passes, and `check:rust` reports `19 snippets checked, 0 failed`.

- [ ] **Step 5: Commit**

```bash
git add e2e README.md CLAUDE.md docs
git commit -m "Add a Rust smoke test and document the multi-course app

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_017NLpMVNceumti16QuEH9eM"
```

- [ ] **Step 6: Hand back**

Ask the user whether to push `multi-course` and open a PR. Mention that the local folder is still `~/repo/cascade-css`, and renaming it is their call.
