# Quiz Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the quiz placeholder with the full Practice experience: the quiz engine, all 7 question renderers, the feedback sheet, results and out-of-hearts screens, persisted progress, and a Playwright smoke test.

**Architecture:** The rules of a run live in a pure reducer (`src/quiz/session.ts`) with pure grading, feedback and preview helpers beside it, all unit-tested without a DOM. `Quiz.tsx` owns one session through `useReducer` and renders one data-driven renderer per question type from `src/quiz/renderers/`. The App reducer banks XP and completed sets when a run finishes, and a small `ProgressStore` module persists them to `localStorage`.

**Tech Stack:** Vite 8, React 19, TypeScript 7, CSS Modules with token custom properties, Vitest 5 + React Testing Library + user-event, Playwright (`@playwright/test`, Chromium).

**Spec:** `docs/superpowers/specs/2026-09-26-css-curriculum-design.md` (sub-project 1, §5), together with `CLAUDE.md` build steps 4–7. Behavior source of truth: `start`, `grade`, `check`, `next`, `resolvePair` and `renderVals()` in `reference/design-canvas/Prototype.dc.html`.

## Global Constraints

- 5 hearts per lesson. A wrong answer costs 1 heart and re-queues the question at the end of the queue.
- XP: +10 on first try, +5 when answered correctly after a miss.
- Match pairs never costs hearts and auto-completes when all 4 pairs match. A wrong pair flashes for 700 ms.
- Out of hearts → "Out of hearts" screen. Queue exhausted → results (XP, first-try %, hearts left).
- Mixed review = one random question per type, in `question-types.json` order. This is unchanged in this sub-project; the spec's changed runs belong to sub-project 2.
- XP is banked into the persisted total only when a run finishes (queue exhausted). An out-of-hearts run banks nothing, as in Duolingo. This decision is not in the prototype.
- Live previews are drawn with real CSS from question data (use `CssBox`), never images.
- Never inject user-typed text into CSS without sanitizing. Use `sanitizeCssKeyword()`, which keeps only `[a-zA-Z-]`, lowercased.
- Accessibility:
  - real `<button>` elements;
  - `aria-pressed` on selectable tiles and chips;
  - `aria-live` on feedback;
  - `role="progressbar"` with values;
  - touch targets ≥ 44px;
  - text contrast ≥ 4.5:1;
  - correct/incorrect never signaled by color alone: icons + text, including in accessible names.
- Respect `prefers-reduced-motion`. The feedback slide-up is the only animation, and `src/styles/global.css` already disables animations under `reduce`.
- Keep content in the JSON files, never in components.
- Persistence stays behind `src/storage/progress.ts` so a backend can replace it. Storage key: `cascade.progress.v1`.
- The only new dependency is `@playwright/test` (dev).
- Commit messages: sentence-case imperative subject (like `Scaffold app: content types, app shell, Learn flow`), ending with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Stored progress that is missing, corrupt, from another version, or blocked** (Safari private mode, quota errors). The app must start with empty progress and never crash; saving must never throw. Pinned in Task 9.
2. **Double-activating Check or Continue** (fast double tap, Enter key repeat). The answer is graded once, only one heart is lost, and no question is skipped. Pinned in Task 2 (`ignores a second Check`, `does nothing before the answer is checked`).
3. **Running out of hearts on a question.** The learner sees "Out of hearts", not results; no XP is banked and `onComplete` is not called. "Try again" restarts with 5 hearts. Pinned in Task 2 and Task 3.
4. **A pairs mismatch flash expiring after the learner has already picked again.** The newer pick must survive; the stale timer must not clear it. Pinned in Task 2 and Task 5.
5. **Punctuation typed into "Type the value"** (`red;color:blue`). It must never reach the preview's CSS. Pinned in Task 1 (`typePreviewCss`) and Task 8 (rendered preview).

---

## File Structure

**Create**

| Path | Responsibility |
|---|---|
| `src/quiz/types.ts` | `AnswerState`, `Session` types |
| `src/quiz/grade.ts` | `freshAnswer`, `canCheck`, `isCorrect`: per-type answer rules |
| `src/quiz/feedback.ts` | `feedbackText`: feedback title and answer line |
| `src/quiz/previews.ts` | `buildPreview`, `tuneLayer`, `typePreviewCss`: CSS strings for live previews |
| `src/quiz/session.ts` | `startSession`, `sessionReducer`, `currentQuestion`, `accuracy`: hearts, XP, queue |
| `src/quiz/tone.ts`, `ToneMark.tsx`, `tone.module.css` | Tile tone (idle/selected/correct/wrong) with icon + accessible text |
| `src/quiz/Quiz.tsx`, `Quiz.module.css` | Quiz screen: header, prompt, renderer, Check bar, feedback slot |
| `src/quiz/FeedbackSheet.tsx`, `FeedbackSheet.module.css` | Slide-up feedback |
| `src/quiz/QuizEnd.tsx`, `QuizEnd.module.css` | Results and Out-of-hearts screens |
| `src/quiz/renderers/types.ts` | `RendererProps` |
| `src/quiz/renderers/QuestionBody.tsx` | Switch from question type to renderer |
| `src/quiz/renderers/{Predict,Versus,Pairs,Build,Tune,Bug,TypeValue}.tsx` + `.module.css` | The 7 renderers |
| `src/quiz/renderers/preview.module.css` | Shared "Goal / Yours / Expected / Actual" figure styles |
| `src/quiz/testUtils.tsx` | `renderQuiz()` test helper |
| `src/storage/progress.ts` | `ProgressStore`, `parseProgress`, `localProgressStore` |
| `playwright.config.ts`, `e2e/smoke.spec.ts` | Browser smoke test |

**Modify:** `src/state/rules.ts`, `src/state/app.ts`, `src/App.tsx`, `src/screens/Home.tsx` (+css), `src/components/{icons,HeartCount,CodePanel}.tsx`, `src/test/setup.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `README.md`.

**Delete:** `src/screens/QuizPlaceholder.tsx`, `src/screens/QuizPlaceholder.module.css`.

Run all commands from the repo root: `/Users/takahiko/repo/cascade-css`.

---

### Task 1: Answer model, grading, feedback text and preview CSS

**Files:**
- Modify: `src/state/rules.ts`
- Create: `src/quiz/types.ts`, `src/quiz/grade.ts`, `src/quiz/feedback.ts`, `src/quiz/previews.ts`
- Test: `src/quiz/grade.test.ts`

**Interfaces:**
- Consumes: `Question` and friends from `src/content` (`questionById(id)`); `sanitizeCssKeyword(value: string): string` from `src/lib/sanitize.ts`.
- Produces:
  - `AnswerState`, `Session` (`src/quiz/types.ts`);
  - `freshAnswer(q: Question | undefined): AnswerState`;
  - `canCheck(q: Question, a: AnswerState): boolean`;
  - `isCorrect(q: Question, a: AnswerState): boolean`;
  - `feedbackText(q: Question, a: AnswerState, index: number): { title: string; detail: string | null }`;
  - `buildPreview(q: BuildQuestion, words: readonly (string | null)[]): { box: string; kids: StyledText[] }`;
  - `tuneLayer(q: TuneQuestion, base: string, value: number): { row: string; kid: string }`;
  - `typePreviewCss(q: TypeQuestion, input: string): string`;
  - constants `XP_FIRST_TRY`, `XP_RETRY`, `PAIR_MISS_FLASH_MS`.

- [ ] **Step 1: Write the failing test**

Create `src/quiz/grade.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { questionById, type BuildQuestion, type Question, type TuneQuestion, type TypeQuestion } from '../content';
import { feedbackText } from './feedback';
import { canCheck, freshAnswer, isCorrect } from './grade';
import { buildPreview, tuneLayer, typePreviewCss } from './previews';
import type { AnswerState } from './types';

const q = <T extends Question = Question>(id: string) => questionById(id) as T;
const answer = (question: Question, patch: Partial<AnswerState> = {}): AnswerState => ({ ...freshAnswer(question), ...patch });

describe('freshAnswer', () => {
  it('starts build slots empty and tune at its start value', () => {
    expect(freshAnswer(q('build-1')).slots).toEqual([null, null]);
    expect(freshAnswer(q('tune-1')).num).toBe(8);
    expect(freshAnswer(q('predict-1'))).toMatchObject({ sel: null, val: '', checked: false, misses: 0, matched: {} });
  });
});

describe('canCheck', () => {
  it('needs a selection for predict, versus and bug', () => {
    for (const id of ['predict-1', 'versus-1', 'bug-1']) expect(canCheck(q(id), answer(q(id)))).toBe(false);
    expect(canCheck(q('predict-1'), answer(q('predict-1'), { sel: 0 }))).toBe(true);
    expect(canCheck(q('versus-1'), answer(q('versus-1'), { sel: 'teal' }))).toBe(true);
  });

  it('needs every build slot filled', () => {
    expect(canCheck(q('build-1'), answer(q('build-1'), { slots: [1, null] }))).toBe(false);
    expect(canCheck(q('build-1'), answer(q('build-1'), { slots: [1, 2] }))).toBe(true);
  });

  it('always allows tune, needs non-blank input for type, never for pairs', () => {
    expect(canCheck(q('tune-1'), answer(q('tune-1')))).toBe(true);
    expect(canCheck(q('type-1'), answer(q('type-1'), { val: '   ' }))).toBe(false);
    expect(canCheck(q('type-1'), answer(q('type-1'), { val: 'x' }))).toBe(true);
    expect(canCheck(q('pairs-1'), answer(q('pairs-1')))).toBe(false);
  });

  it('is false once checked', () => {
    expect(canCheck(q('tune-1'), answer(q('tune-1'), { checked: true }))).toBe(false);
  });
});

describe('isCorrect', () => {
  it('compares predict and bug by index/line, versus by keyword', () => {
    expect(isCorrect(q('predict-1'), answer(q('predict-1'), { sel: 2 }))).toBe(true);
    expect(isCorrect(q('predict-1'), answer(q('predict-1'), { sel: 1 }))).toBe(false);
    expect(isCorrect(q('bug-1'), answer(q('bug-1'), { sel: 4 }))).toBe(true);
    expect(isCorrect(q('versus-1'), answer(q('versus-1'), { sel: 'teal' }))).toBe(true);
    expect(isCorrect(q('versus-1'), answer(q('versus-1'), { sel: 'tomato' }))).toBe(false);
  });

  it('grades build by the words behind the chosen bank indexes, so duplicate words both count', () => {
    // build-2 bank: flex-end, center, bottom, flex-end, flex-start, space-between
    expect(isCorrect(q('build-2'), answer(q('build-2'), { slots: [3, 0] }))).toBe(true);
    expect(isCorrect(q('build-2'), answer(q('build-2'), { slots: [0, 2] }))).toBe(false);
  });

  it('requires the exact tune target', () => {
    expect(isCorrect(q('tune-1'), answer(q('tune-1'), { num: 24 }))).toBe(true);
    expect(isCorrect(q('tune-1'), answer(q('tune-1'), { num: 20 }))).toBe(false);
  });

  it('sanitizes typed input before comparing', () => {
    expect(isCorrect(q('type-1'), answer(q('type-1'), { val: '  UpperCase; ' }))).toBe(true);
    expect(isCorrect(q('type-2'), answer(q('type-2'), { val: 'oblique' }))).toBe(true);
    expect(isCorrect(q('type-1'), answer(q('type-1'), { val: 'upper' }))).toBe(false);
  });

  it('treats pairs as correct only when all are matched', () => {
    expect(isCorrect(q('pairs-1'), answer(q('pairs-1'), { matched: { a: true, b: true, c: true } }))).toBe(false);
    expect(isCorrect(q('pairs-1'), answer(q('pairs-1'), { matched: { a: true, b: true, c: true, d: true } }))).toBe(true);
  });
});

describe('feedbackText', () => {
  it('praises correct answers, rotating by queue position', () => {
    const p = q('predict-1');
    expect(feedbackText(p, answer(p, { checked: true, ok: true }), 0)).toEqual({ title: 'Nice — that’s right!', detail: null });
    expect(feedbackText(p, answer(p, { checked: true, ok: true }), 5).title).toBe('Nailed it!');
  });

  it('gives the answer line when wrong', () => {
    const p = q('predict-1');
    expect(feedbackText(p, answer(p, { checked: true }), 0)).toEqual({ title: 'Not quite', detail: 'Answer: C' });
    const b = q('build-1');
    expect(feedbackText(b, answer(b, { checked: true }), 0).detail).toBe('Answer: display: grid; place-items: center;');
    const t = q('tune-1');
    expect(feedbackText(t, answer(t, { checked: true, num: 16 }), 0)).toEqual({
      title: 'Close, but not aligned',
      detail: 'You set 16px — the target is 24px.',
    });
    const y = q('type-1');
    expect(feedbackText(y, answer(y, { checked: true }), 0).detail).toBe('Answer: text-transform: uppercase;');
  });

  it('names the answer in the title for versus and bug', () => {
    expect(feedbackText(q('versus-1'), answer(q('versus-1'), { checked: true }), 0)).toEqual({ title: 'Not quite — it’s teal', detail: null });
    expect(feedbackText(q('bug-1'), answer(q('bug-1'), { checked: true }), 0)).toEqual({ title: 'Not that one — it’s line 4', detail: null });
  });

  it('always reports mismatches for pairs', () => {
    const p = q('pairs-1');
    expect(feedbackText(p, answer(p, { checked: true, ok: true }), 0)).toEqual({ title: 'All pairs matched!', detail: 'Flawless — no mismatches.' });
    expect(feedbackText(p, answer(p, { checked: true, ok: true, misses: 1 }), 0).detail).toBe('1 mismatch along the way.');
    expect(feedbackText(p, answer(p, { checked: true, ok: true, misses: 3 }), 0).detail).toBe('3 mismatches along the way.');
  });
});

describe('previews', () => {
  it('applies build words to the parent, falling back to defaults', () => {
    const b = q<BuildQuestion>('build-1');
    expect(buildPreview(b, ['grid', null]).box).toBe(`${b.boxBase};display:grid;place-items:normal`);
  });

  it('applies build words to each child when apply is child', () => {
    const b = q<BuildQuestion>('build-3');
    const p = buildPreview(b, ['999px', '10px 28px']);
    expect(p.box).toBe(b.boxBase);
    expect(p.kids[0]!.s).toBe(`${b.kids[0]!.s};border-radius:999px;padding:10px 28px`);
  });

  it('puts tune declarations on the row or on the kids', () => {
    const t = q<TuneQuestion>('tune-1'); // apply: parent
    expect(tuneLayer(t, t.yours, 12)).toEqual({ row: 'gap:12px', kid: t.yours });
    const c = q<TuneQuestion>('tune-2'); // apply: child
    expect(tuneLayer(c, c.ghost, 20)).toEqual({ row: '', kid: `${c.ghost};padding:20px` });
  });

  it('never lets typed punctuation into the preview CSS', () => {
    const y = q<TypeQuestion>('type-1');
    expect(typePreviewCss(y, 'red;color:blue}')).toBe(`${y.base};text-transform:redcolorblue`);
    expect(typePreviewCss(y, '')).toBe(`${y.base};text-transform:initial`);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/quiz/grade.test.ts`
Expected: FAIL. The imports can't be resolved (`Failed to resolve import "./feedback"`).

- [ ] **Step 3: Write the implementation**

Replace `src/state/rules.ts`:

```ts
// Game rules shared by the shell and the quiz engine.
export const HEARTS_PER_LESSON = 5;
export const XP_FIRST_TRY = 10;
export const XP_RETRY = 5;
/** How long a mismatched pair stays highlighted. */
export const PAIR_MISS_FLASH_MS = 700;
```

Create `src/quiz/types.ts`:

```ts
import type { LessonKey } from '../content';

/** The learner's in-progress answer to the current question. Fields unused by a type keep their defaults. */
export interface AnswerState {
  /** predict: option index · versus: color keyword · bug: 1-based line number. */
  sel: number | string | null;
  /** build: bank index placed in each slot (indexes, because the bank may repeat words). */
  slots: (number | null)[];
  /** tune: current value. */
  num: number;
  /** type: raw input (sanitized only when it touches CSS or is graded). */
  val: string;
  /** pairs: pending picks, matched item ids, the mismatch being flashed, and mismatch count. */
  left: string | null;
  right: string | null;
  matched: Record<string, true>;
  miss: { left: string; right: string } | null;
  misses: number;
  checked: boolean;
  ok: boolean;
}

export interface Session {
  lessonKey: LessonKey;
  /** Question ids; wrong answers are appended again. */
  queue: string[];
  idx: number;
  /** Initial queue length; the progress bar is solved / total. */
  total: number;
  hearts: number;
  solved: number;
  firstTry: number;
  xp: number;
  missed: Record<string, true>;
  answer: AnswerState;
  phase: 'question' | 'done' | 'out';
}
```

Create `src/quiz/grade.ts`:

```ts
// Per-type answer rules — a port of freshQ() and check() in the prototype.
import type { Question } from '../content';
import { sanitizeCssKeyword } from '../lib/sanitize';
import type { AnswerState } from './types';

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

export function isCorrect(q: Question, a: AnswerState): boolean {
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

Create `src/quiz/feedback.ts`:

```ts
// Feedback sheet copy — ported from renderVals() in the prototype.
import type { Question } from '../content';
import type { AnswerState } from './types';

const PRAISE = ['Nice — that’s right!', 'Nailed it!', 'Exactly right!', 'Sharp eye!'];

export interface FeedbackText {
  title: string;
  /** Bold line under the title ("Answer: …"), or null when there is none to show. */
  detail: string | null;
}

/** `index` is the question's position in the queue; it rotates the praise. */
export function feedbackText(q: Question, a: AnswerState, index: number): FeedbackText {
  let title = a.ok ? PRAISE[index % PRAISE.length]! : 'Not quite';
  if (q.type === 'pairs') title = 'All pairs matched!';
  if (!a.ok && q.type === 'versus') title = `Not quite — it’s ${q.answer}`;
  if (!a.ok && q.type === 'bug') title = `Not that one — it’s line ${q.answer}`;
  if (!a.ok && q.type === 'tune') title = 'Close, but not aligned';

  const line = answerLine(q, a);
  if (q.type === 'pairs') return { title, detail: line };
  return { title, detail: !a.ok && line ? line : null };
}

function answerLine(q: Question, a: AnswerState): string {
  switch (q.type) {
    case 'predict':
      return `Answer: ${String.fromCharCode(65 + q.answer)}`;
    case 'pairs':
      return a.misses === 0
        ? 'Flawless — no mismatches.'
        : `${a.misses} ${a.misses === 1 ? 'mismatch' : 'mismatches'} along the way.`;
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

Create `src/quiz/previews.ts`:

```ts
// CSS strings for live previews. All content-authored except typed input,
// which only reaches CSS through sanitizeCssKeyword().
import type { BuildQuestion, StyledText, TuneQuestion, TypeQuestion } from '../content';
import { sanitizeCssKeyword } from '../lib/sanitize';

export interface BuildPreview {
  box: string;
  kids: StyledText[];
}

/** A word-bank box with `words` applied; empty slots fall back to `defaults`. */
export function buildPreview(q: BuildQuestion, words: readonly (string | null)[]): BuildPreview {
  const decl = q.props.map((p, i) => `${p}:${words[i] ?? q.defaults[i]}`).join(';');
  if (q.apply === 'parent') return { box: `${q.boxBase};${decl}`, kids: q.kids };
  return { box: q.boxBase, kids: q.kids.map((k) => ({ s: `${k.s};${decl}`, t: k.t })) };
}

export interface TuneLayer {
  /** Extra CSS for the row (the parent). */
  row: string;
  /** CSS for each child. */
  kid: string;
}

/** One layer of a tune question — the ghost target or the learner's boxes — at `value`. */
export function tuneLayer(q: TuneQuestion, base: string, value: number): TuneLayer {
  const decl = `${q.prop}:${value}${q.unit}`;
  return { row: q.apply === 'parent' ? decl : '', kid: q.apply === 'child' ? `${base};${decl}` : base };
}

/** Preview CSS for "Type the value". Only a sanitized keyword reaches CSS. */
export function typePreviewCss(q: TypeQuestion, input: string): string {
  return `${q.base};${q.prop}:${sanitizeCssKeyword(input) || 'initial'}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/quiz/grade.test.ts && npx tsc --noEmit`
Expected: all tests in `grade.test.ts` PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/state/rules.ts src/quiz/types.ts src/quiz/grade.ts src/quiz/feedback.ts src/quiz/previews.ts src/quiz/grade.test.ts
git commit -m "Add quiz grading, feedback copy and preview CSS helpers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Session reducer (hearts, XP, re-queue, pairs)

**Files:**
- Create: `src/quiz/session.ts`
- Test: `src/quiz/session.test.ts`

**Interfaces:**
- Consumes: from Task 1, `freshAnswer`, `canCheck`, `isCorrect`, `AnswerState`, `Session`, `HEARTS_PER_LESSON`, `XP_FIRST_TRY`, `XP_RETRY`; from content, `questionById`, `LessonKey`, `Question`, `PairsQuestion`.
- Produces:
  - `type SessionAction`, exactly the union in Step 3;
  - `startSession(lessonKey: LessonKey, ids: readonly string[], hearts?: number): Session`;
  - `sessionReducer(s: Session, action: SessionAction): Session`;
  - `currentQuestion(s: Session): Question | undefined`;
  - `accuracy(s: Session): number` (first-try %, rounded).

- [ ] **Step 1: Write the failing test**

Create `src/quiz/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { accuracy, currentQuestion, sessionReducer, startSession, type SessionAction } from './session';
import type { Session } from './types';

const run = (s: Session, ...actions: SessionAction[]) => actions.reduce(sessionReducer, s);
const bugs = () => startSession('bug', ['bug-1', 'bug-2', 'bug-3']); // answers: lines 4, 3, 3
const pickLine = (line: number): SessionAction[] => [{ type: 'select', sel: line }, { type: 'check' }];
const next: SessionAction = { type: 'next' };

describe('startSession', () => {
  it('starts with full hearts on the first question', () => {
    const s = bugs();
    expect(s).toMatchObject({ idx: 0, total: 3, hearts: 5, xp: 0, solved: 0, phase: 'question' });
    expect(currentQuestion(s)?.id).toBe('bug-1');
  });

  it('drops unknown ids and finishes immediately when nothing is left', () => {
    expect(startSession('bug', ['nope', 'bug-2']).queue).toEqual(['bug-2']);
    expect(startSession('bug', []).phase).toBe('done');
  });
});

describe('grading', () => {
  it('awards 10 XP for a first-try answer', () => {
    const s = run(bugs(), ...pickLine(4));
    expect(s).toMatchObject({ solved: 1, firstTry: 1, xp: 10, hearts: 5 });
    expect(s.answer).toMatchObject({ checked: true, ok: true });
  });

  it('costs a heart and re-queues a wrong answer', () => {
    const s = run(bugs(), ...pickLine(1));
    expect(s).toMatchObject({ hearts: 4, solved: 0, xp: 0 });
    expect(s.queue).toEqual(['bug-1', 'bug-2', 'bug-3', 'bug-1']);
    expect(s.missed).toEqual({ 'bug-1': true });
  });

  it('awards 5 XP when a missed question comes back and is answered', () => {
    const s = run(bugs(), ...pickLine(1), next, ...pickLine(3), next, ...pickLine(3), next, ...pickLine(4));
    expect(s).toMatchObject({ solved: 3, firstTry: 2, xp: 25, hearts: 4 });
    expect(accuracy(s)).toBe(67);
  });

  it('ignores a second Check on the same question', () => {
    const s = run(bugs(), ...pickLine(1), { type: 'check' }, { type: 'select', sel: 4 }, { type: 'check' });
    expect(s.hearts).toBe(4);
    expect(s.queue).toHaveLength(4);
    expect(s.answer.sel).toBe(1);
  });

  it('ignores Check when the answer is incomplete', () => {
    expect(run(bugs(), { type: 'check' }).answer.checked).toBe(false);
  });
});

describe('next', () => {
  it('does nothing before the answer is checked', () => {
    expect(run(bugs(), next).idx).toBe(0);
  });

  it('moves on with a fresh answer', () => {
    const s = run(bugs(), ...pickLine(4), next);
    expect(s.idx).toBe(1);
    expect(s.answer).toMatchObject({ sel: null, checked: false });
    expect(currentQuestion(s)?.id).toBe('bug-2');
  });

  it('finishes when the queue is exhausted', () => {
    const s = run(bugs(), ...pickLine(4), next, ...pickLine(3), next, ...pickLine(3), next);
    expect(s.phase).toBe('done');
    expect(s).toMatchObject({ xp: 30, firstTry: 3, hearts: 5 });
    expect(accuracy(s)).toBe(100);
  });

  it('ends the run when hearts run out, even with questions left', () => {
    let s = bugs();
    for (let i = 0; i < 4; i++) s = run(s, ...pickLine(1), next);
    expect(s).toMatchObject({ phase: 'question', hearts: 1 });
    s = run(s, ...pickLine(1));
    expect(s.hearts).toBe(0);
    expect(run(s, next).phase).toBe('out');
  });

  it('ignores answer actions after the run ends', () => {
    const done = run(bugs(), ...pickLine(4), next, ...pickLine(3), next, ...pickLine(3), next);
    expect(run(done, { type: 'select', sel: 2 }, { type: 'check' }, next)).toBe(done);
  });
});

describe('answer actions', () => {
  it('fills build slots left to right from bank indexes and clears them', () => {
    let s = run(startSession('build', ['build-2']), { type: 'placeWord', bankIndex: 3 }, { type: 'placeWord', bankIndex: 3 });
    expect(s.answer.slots).toEqual([3, null]); // the same chip can't be placed twice
    s = run(s, { type: 'placeWord', bankIndex: 0 }, { type: 'placeWord', bankIndex: 1 });
    expect(s.answer.slots).toEqual([3, 0]); // no empty slot left for chip 1
    s = run(s, { type: 'clearSlot', slot: 0 }, { type: 'placeWord', bankIndex: 1 });
    expect(s.answer.slots).toEqual([1, 0]);
  });

  it('steps tune values within min and max', () => {
    const t = startSession('tune', ['tune-1']); // start 8, step 4, range 0..48
    expect(run(t, { type: 'step', dir: 1 }).answer.num).toBe(12);
    expect(run(t, { type: 'step', dir: -1 }, { type: 'step', dir: -1 }, { type: 'step', dir: -1 }).answer.num).toBe(0);
  });

  it('locks the answer once checked', () => {
    const s = run(startSession('type', ['type-1']), { type: 'input', val: 'uppercase' }, { type: 'check' }, { type: 'input', val: 'x' });
    expect(s.answer.val).toBe('uppercase');
  });
});

describe('pairs', () => {
  const pairs = () => startSession('pairs', ['pairs-1']);
  const pick = (side: 'left' | 'right', id: string): SessionAction => ({ type: 'pickPair', side, id });

  it('matches a left and right pick in either order', () => {
    let s = run(pairs(), pick('left', 'a'), pick('right', 'a'));
    expect(s.answer.matched).toEqual({ a: true });
    s = run(s, pick('right', 'b'), pick('left', 'b'));
    expect(s.answer.matched).toEqual({ a: true, b: true });
    expect(s.answer).toMatchObject({ left: null, right: null });
  });

  it('flags a mismatch without costing a heart', () => {
    const s = run(pairs(), pick('left', 'a'), pick('right', 'b'));
    expect(s.answer).toMatchObject({ miss: { left: 'a', right: 'b' }, misses: 1, left: null, right: null });
    expect(s.hearts).toBe(5);
    expect(run(s, { type: 'clearMiss' }).answer.miss).toBeNull();
  });

  it('clears a showing mismatch as soon as the next tile is picked, and a late clearMiss keeps the new pick', () => {
    const s = run(pairs(), pick('left', 'a'), pick('right', 'b'), pick('left', 'c'));
    expect(s.answer).toMatchObject({ miss: null, left: 'c' });
    expect(run(s, { type: 'clearMiss' }).answer.left).toBe('c');
  });

  it('auto-completes with first-try XP when all four are matched', () => {
    const all = ['a', 'b', 'c', 'd'].flatMap((id) => [pick('left', id), pick('right', id)]);
    const s = run(pairs(), pick('left', 'a'), pick('right', 'b'), ...all);
    expect(s.answer).toMatchObject({ checked: true, ok: true, misses: 1 });
    expect(s).toMatchObject({ xp: 10, firstTry: 1, hearts: 5, solved: 1 });
  });

  it('ignores picks on matched tiles', () => {
    const s = run(pairs(), pick('left', 'a'), pick('right', 'a'), pick('left', 'a'));
    expect(s.answer.left).toBeNull();
  });
});

describe('start', () => {
  it('restarts a run from scratch', () => {
    const s = run(bugs(), ...pickLine(1), { type: 'start', lessonKey: 'bug', ids: ['bug-2'] });
    expect(s).toMatchObject({ hearts: 5, idx: 0, queue: ['bug-2'], missed: {}, xp: 0, phase: 'question' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/quiz/session.test.ts`
Expected: FAIL with `Failed to resolve import "./session"`.

- [ ] **Step 3: Write the implementation**

Create `src/quiz/session.ts`:

```ts
// One quiz run — a pure port of start/grade/check/next/resolvePair in the prototype.
import { questionById, type LessonKey, type PairsQuestion, type Question } from '../content';
import { HEARTS_PER_LESSON, XP_FIRST_TRY, XP_RETRY } from '../state/rules';
import { canCheck, freshAnswer, isCorrect } from './grade';
import type { AnswerState, Session } from './types';

export type SessionAction =
  | { type: 'start'; lessonKey: LessonKey; ids: readonly string[] }
  | { type: 'select'; sel: number | string }
  | { type: 'placeWord'; bankIndex: number }
  | { type: 'clearSlot'; slot: number }
  | { type: 'step'; dir: 1 | -1 }
  | { type: 'input'; val: string }
  | { type: 'pickPair'; side: 'left' | 'right'; id: string }
  | { type: 'clearMiss' }
  | { type: 'check' }
  | { type: 'next' };

export function startSession(lessonKey: LessonKey, ids: readonly string[], hearts = HEARTS_PER_LESSON): Session {
  const queue = ids.filter((id) => questionById(id));
  return {
    lessonKey,
    queue,
    idx: 0,
    total: queue.length,
    hearts,
    solved: 0,
    firstTry: 0,
    xp: 0,
    missed: {},
    answer: freshAnswer(queue[0] === undefined ? undefined : questionById(queue[0])),
    phase: queue.length ? 'question' : 'done',
  };
}

export function currentQuestion(s: Session): Question | undefined {
  const id = s.queue[s.idx];
  return id === undefined ? undefined : questionById(id);
}

/** First-try percentage for the results screen. */
export function accuracy(s: Session): number {
  return s.total ? Math.round((s.firstTry / s.total) * 100) : 0;
}

function withAnswer(s: Session, patch: Partial<AnswerState>): Session {
  return { ...s, answer: { ...s.answer, ...patch } };
}

function grade(s: Session, q: Question, ok: boolean, patch: Partial<AnswerState> = {}): Session {
  const graded = withAnswer(s, { ...patch, checked: true, ok });
  if (ok) {
    const first = !s.missed[q.id];
    return {
      ...graded,
      solved: s.solved + 1,
      firstTry: s.firstTry + (first ? 1 : 0),
      xp: s.xp + (first ? XP_FIRST_TRY : XP_RETRY),
    };
  }
  return { ...graded, hearts: Math.max(0, s.hearts - 1), missed: { ...s.missed, [q.id]: true }, queue: [...s.queue, q.id] };
}

function resolvePair(s: Session, q: PairsQuestion, left: string, right: string): Session {
  if (left === right) {
    const matched = { ...s.answer.matched, [left]: true as const };
    const patch = { matched, left: null, right: null, miss: null };
    return q.items.every((it) => matched[it.id]) ? grade(s, q, true, patch) : withAnswer(s, patch);
  }
  return withAnswer(s, { miss: { left, right }, left: null, right: null, misses: s.answer.misses + 1 });
}

export function sessionReducer(s: Session, action: SessionAction): Session {
  if (action.type === 'start') return startSession(action.lessonKey, action.ids);

  const q = currentQuestion(s);
  const a = s.answer;
  if (s.phase !== 'question' || !q) return s;

  switch (action.type) {
    case 'select':
      return a.checked ? s : withAnswer(s, { sel: action.sel });

    case 'placeWord': {
      if (q.type !== 'build' || a.checked || a.slots.includes(action.bankIndex)) return s;
      const at = a.slots.indexOf(null);
      if (at === -1) return s;
      const slots = [...a.slots];
      slots[at] = action.bankIndex;
      return withAnswer(s, { slots });
    }

    case 'clearSlot': {
      if (a.checked || a.slots[action.slot] == null) return s;
      const slots = [...a.slots];
      slots[action.slot] = null;
      return withAnswer(s, { slots });
    }

    case 'step': {
      if (q.type !== 'tune' || a.checked) return s;
      return withAnswer(s, { num: Math.min(q.max, Math.max(q.min, a.num + action.dir * q.step)) });
    }

    case 'input':
      return a.checked ? s : withAnswer(s, { val: action.val });

    case 'pickPair': {
      if (q.type !== 'pairs' || a.checked || a.matched[action.id]) return s;
      if (action.side === 'left') {
        return a.right ? resolvePair(s, q, action.id, a.right) : withAnswer(s, { left: action.id, miss: null });
      }
      return a.left ? resolvePair(s, q, a.left, action.id) : withAnswer(s, { right: action.id, miss: null });
    }

    case 'clearMiss':
      return a.miss ? withAnswer(s, { miss: null }) : s;

    case 'check':
      return canCheck(q, a) ? grade(s, q, isCorrect(q, a)) : s;

    case 'next': {
      if (!a.checked) return s;
      if (s.hearts <= 0) return { ...s, phase: 'out' };
      const idx = s.idx + 1;
      const id = s.queue[idx];
      if (id === undefined) return { ...s, phase: 'done' };
      return { ...s, idx, answer: freshAnswer(questionById(id)) };
    }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/quiz && npx tsc --noEmit`
Expected: all `src/quiz` tests PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/quiz/session.ts src/quiz/session.test.ts
git commit -m "Add quiz session reducer with hearts, XP and re-queueing" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Quiz screen, feedback sheet, end screens and Predict renderer, wired into the app

This replaces the placeholder with a working quiz for **predict** questions. The other types render nothing until Tasks 4–8 add their cases to `QuestionBody`.

**Files:**
- Modify: `src/components/icons.tsx`, `src/components/HeartCount.tsx`, `src/components/CodePanel.tsx`, `src/state/app.ts`, `src/state/app.test.ts`, `src/App.tsx`, `src/App.test.tsx`, `src/screens/Home.tsx`, `src/screens/Home.module.css`
- Create: `src/quiz/tone.ts`, `src/quiz/ToneMark.tsx`, `src/quiz/tone.module.css`, `src/quiz/renderers/types.ts`, `src/quiz/renderers/QuestionBody.tsx`, `src/quiz/renderers/Predict.tsx`, `src/quiz/renderers/Predict.module.css`, `src/quiz/FeedbackSheet.tsx`, `src/quiz/FeedbackSheet.module.css`, `src/quiz/QuizEnd.tsx`, `src/quiz/QuizEnd.module.css`, `src/quiz/Quiz.tsx`, `src/quiz/Quiz.module.css`, `src/quiz/testUtils.tsx`
- Delete: `src/screens/QuizPlaceholder.tsx`, `src/screens/QuizPlaceholder.module.css`
- Test: `src/quiz/Quiz.test.tsx`, plus updates to `src/state/app.test.ts` and `src/App.test.tsx`

**Interfaces:**
- Consumes: Task 2 `startSession`, `sessionReducer`, `currentQuestion`, `accuracy`, `SessionAction`; Task 1 `canCheck`, `feedbackText`; existing `CssBox`, `CodePanel`, `RichText`, `Button`, `ProgressBar`, `HeartCount`, `lessonQuestionIds`, `lessonName`, `questionTypes`.
- Produces:
  - `Quiz` component: `{ lessonKey: LessonKey; onExit(): void; onComplete(r: QuizResult): void }`, with `QuizResult = { lessonKey: LessonKey; xp: number }`;
  - `RendererProps<Q>` = `{ question: Q; answer: AnswerState; act(a: SessionAction): void }`;
  - `tone(picked, isAnswer, checked): Tone`, `toneLabel(t: Tone): string`, `ToneMark({ tone })`;
  - `toneStyles` classes `tile idle selected correct wrong` (from `src/quiz/tone.module.css`);
  - `CodeTokens({ line })` exported from `CodePanel.tsx`;
  - icons `CheckIcon XCircleIcon StarIcon BrokenHeartIcon MinusIcon PlusIcon`;
  - `HeartCount` gains an optional `label`;
  - App action `{ type: 'completeQuiz'; lessonKey: LessonKey; xp: number }` and `AppState.totalXp: number`;
  - `renderQuiz(lessonKey, userEventOptions?)` test helper returning `{ user, onExit, onComplete }`.

- [ ] **Step 1: Write the failing tests**

Create `src/quiz/testUtils.tsx`:

```tsx
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { LessonKey } from '../content';
import { Quiz } from './Quiz';

/** Render a quiz run for `lessonKey` (a question type key gives all questions of that type, in file order). */
export function renderQuiz(lessonKey: LessonKey, options: Parameters<typeof userEvent.setup>[0] = {}) {
  const onExit = vi.fn();
  const onComplete = vi.fn();
  const user = userEvent.setup(options);
  render(<Quiz lessonKey={lessonKey} onExit={onExit} onComplete={onComplete} />);
  return { user, onExit, onComplete };
}
```

Create `src/quiz/Quiz.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from './testUtils';

// predict answers in file order: predict-1 C, predict-2 A, predict-3 D, predict-4 B
const check = () => screen.getByRole('button', { name: 'Check' });
const feedback = () => screen.getByRole('region', { name: 'Feedback' });

async function answer(user: UserEvent, letter: string) {
  await user.click(screen.getByRole('button', { name: new RegExp(`^Option ${letter}:`) }));
  await user.click(check());
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('Quiz with predict questions', () => {
  it('shows the type, prompt, code and four drawn options', () => {
    renderQuiz('predict');
    expect(screen.getByText('Predict the render')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which row does this CSS draw?');
    expect(screen.getByLabelText('CSS')).toHaveTextContent('justify-content: space-between;');
    expect(screen.getAllByRole('button', { name: /^Option [A-D]:/ })).toHaveLength(4);
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
    expect(check()).toBeDisabled();
  });

  it('checks a correct pick and shows praise, the explanation and a focused Continue', async () => {
    const { user } = renderQuiz('predict');
    const c = screen.getByRole('button', { name: 'Option C: spread out, centered vertically' });
    await user.click(c);
    expect(c).toHaveAttribute('aria-pressed', 'true');
    await user.click(check());
    expect(feedback()).toHaveTextContent('Nice — that’s right!');
    expect(feedback()).toHaveTextContent('justify-content places items along the main axis');
    expect(within(feedback()).getByRole('button', { name: 'Continue' })).toHaveFocus();
    expect(screen.getByRole('button', { name: /^Option C: .*, correct answer$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuenow', '25');
  });

  it('marks a wrong pick with text, shows the answer and costs a heart', async () => {
    const { user } = renderQuiz('predict');
    await user.click(screen.getByRole('button', { name: /^Option A:/ }));
    await user.click(check());
    expect(feedback()).toHaveTextContent('Not quite');
    expect(feedback()).toHaveTextContent('Answer: C');
    expect(screen.getByRole('button', { name: /^Option A: .*, your answer, incorrect$/ })).toBeInTheDocument();
    expect(screen.getByText('4 hearts left')).toBeInTheDocument();
  });

  it('moves to the next question and focuses its prompt', async () => {
    const { user } = renderQuiz('predict');
    await answer(user, 'C');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Which stack does this CSS draw?');
    expect(h1).toHaveFocus();
  });

  it('quits from the close button', async () => {
    const { user, onExit } = renderQuiz('predict');
    await user.click(screen.getByRole('button', { name: 'Quit lesson' }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});

describe('end of a run', () => {
  it('shows results, reports the run once, and can practice again', async () => {
    const { user, onComplete, onExit } = renderQuiz('predict');
    for (const letter of ['C', 'A', 'D', 'B']) await answer(user, letter);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lesson complete!');
    expect(screen.getByText('Predict the render')).toBeInTheDocument();
    expect(screen.getByText('+40')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Perfect run — every answer right on the first try.')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith({ lessonKey: 'predict', xp: 40 });

    await user.click(screen.getByRole('button', { name: 'Practice again' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which row does this CSS draw?');
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quit lesson' }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('ends on Out of hearts after five misses without reporting a finished run', async () => {
    const { user, onComplete } = renderQuiz('predict');
    for (const letter of ['A', 'B', 'A', 'A', 'A']) await answer(user, letter); // all wrong
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Out of hearts');
    expect(onComplete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which row does this CSS draw?');
  });
});
```

Append to `src/state/app.test.ts`, inside the existing `describe('appReducer', …)` block:

```ts
  it('records a finished quiz and banks its XP', () => {
    const s = run(
      { type: 'startQuiz', lessonKey: 'bug' },
      { type: 'completeQuiz', lessonKey: 'bug', xp: 25 },
      { type: 'completeQuiz', lessonKey: 'mixed', xp: 10 },
    );
    expect(s.completedSets).toEqual({ bug: true, mixed: true });
    expect(s.totalXp).toBe(35);
  });
```

In `src/App.test.tsx`, replace the body of the test `'Practice this starts the unit’s topic quiz'` after the `Practice this` click with:

```tsx
    expect(heading()).toHaveTextContent('Which layout does this grid draw?');
    expect(screen.getByText('Predict the render')).toBeInTheDocument();
```

(remove the two old expectations about `Grid basics — practice` and `3 questions queued`), and add to `describe('Home', …)`:

```tsx
  it('shows total XP in the header', () => {
    render(<App />);
    expect(screen.getByText('0 XP')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run`
Expected: FAIL. `Quiz.test.tsx` can't resolve `./Quiz`; `app.test.ts` fails on `totalXp`; `App.test.tsx` fails on `0 XP` and on the quiz heading.

- [ ] **Step 3: Add the shared building blocks**

Append to `src/components/icons.tsx`:

```tsx
export function CheckIcon({ size = 16, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={3} {...rest}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function XCircleIcon({ size = 22, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={2.5} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </Svg>
  );
}

export function StarIcon({ size = 96, ...rest }: IconProps) {
  return (
    <Svg size={size} fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth={1.6} strokeLinejoin="round" {...rest}>
      <path d="M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L3 9.4l6.2-.9z" />
    </Svg>
  );
}

export function BrokenHeartIcon({ size = 96, ...rest }: IconProps) {
  return (
    <Svg size={size} fill="none" stroke="var(--wrong)" strokeWidth={1.6} strokeLinejoin="round" {...rest}>
      <path d="M12 21s-7.5-4.6-9.5-9.4C1.2 8.4 3.3 5 6.6 5c2 0 3.4 1.1 4.4 2.5C12 6.1 13.4 5 15.4 5c3.3 0 5.4 3.4 4.1 6.6C19.5 16.4 12 21 12 21z" />
      <path d="M12 7.5l-1.5 3.5 3 2-1.5 3.5" />
    </Svg>
  );
}

export function MinusIcon({ size = 24, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={3} {...rest}>
      <path d="M5 12h14" />
    </Svg>
  );
}

export function PlusIcon({ size = 24, ...rest }: IconProps) {
  return (
    <Svg size={size} {...stroke} strokeWidth={3} {...rest}>
      <path d="M5 12h14M12 5v14" />
    </Svg>
  );
}
```

Replace `src/components/HeartCount.tsx`:

```tsx
import { HeartIcon } from './icons';
import styles from './HeartCount.module.css';

/** Heart icon + number. `label` overrides the screen-reader text (e.g. "3 hearts left"). */
export function HeartCount({ count, label }: { count: number; label?: string }) {
  return (
    <p className={styles.hearts}>
      <HeartIcon />
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{label ?? (count === 1 ? '1 heart' : `${count} hearts`)}</span>
    </p>
  );
}
```

Replace `src/components/CodePanel.tsx`:

```tsx
import { highlightLine } from '../lib/highlight';
import styles from './CodePanel.module.css';

/** One syntax-colored line of CSS (no wrapper). `§` lines are HTML. */
export function CodeTokens({ line }: { line: string }) {
  return (
    <>
      {highlightLine(line).map((t, j) => (
        <span key={j} className={styles[t.kind]}>
          {t.text}
        </span>
      ))}
    </>
  );
}

/** Dark editor panel with syntax colors. */
export function CodePanel({ lines, label }: { lines: readonly string[]; label?: string }) {
  return (
    <pre className={styles.panel} aria-label={label}>
      <code>
        {lines.map((line, i) => (
          <span key={i} className={styles.line}>
            <CodeTokens line={line} />
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  );
}
```

Create `src/quiz/tone.ts`:

```ts
/** Visual state of a selectable answer tile. */
export type Tone = 'idle' | 'selected' | 'correct' | 'wrong';

export function tone(picked: boolean, isAnswer: boolean, checked: boolean): Tone {
  if (checked && isAnswer) return 'correct';
  if (checked && picked) return 'wrong';
  if (picked) return 'selected';
  return 'idle';
}

/** Appended to a tile's accessible name so correctness is never conveyed by color alone. */
export function toneLabel(t: Tone): string {
  if (t === 'correct') return ', correct answer';
  if (t === 'wrong') return ', your answer, incorrect';
  return '';
}
```

Create `src/quiz/ToneMark.tsx`:

```tsx
import { CheckIcon, CloseIcon } from '../components/icons';
import type { Tone } from './tone';
import styles from './tone.module.css';

/** ✓ / ✕ badge in a tile's corner after checking. Visual only; the text lives in the tile's accessible name. */
export function ToneMark({ tone }: { tone: Tone }) {
  if (tone !== 'correct' && tone !== 'wrong') return null;
  return (
    <span className={`${styles.mark} ${tone === 'correct' ? styles.markCorrect : styles.markWrong}`} aria-hidden="true">
      {tone === 'correct' ? <CheckIcon size={14} /> : <CloseIcon size={14} strokeWidth={3} />}
    </span>
  );
}
```

Create `src/quiz/tone.module.css`:

```css
/* Light answer tiles (predict, versus, pairs). Bug lines have their own dark variant. */
.tile {
  position: relative;
  border: 2px solid var(--line);
  border-bottom-width: 5px;
  border-radius: var(--radius-tile);
  background: var(--surface);
  color: var(--ink);
}

.idle {
  border-color: var(--line);
}

.selected {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.correct {
  border-color: var(--correct);
  background: var(--correct-bg);
}

.wrong {
  border-color: var(--wrong);
  background: var(--wrong-bg);
}

.mark {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
}

.markCorrect {
  background: var(--correct);
}

.markWrong {
  background: var(--wrong);
}
```

- [ ] **Step 4: Add the Predict renderer and the renderer switch**

Create `src/quiz/renderers/types.ts`:

```ts
import type { Question } from '../../content';
import type { SessionAction } from '../session';
import type { AnswerState } from '../types';

export interface RendererProps<Q extends Question> {
  question: Q;
  answer: AnswerState;
  act: (action: SessionAction) => void;
}
```

Create `src/quiz/renderers/QuestionBody.tsx`:

```tsx
import type { Question } from '../../content';
import { Predict } from './Predict';
import type { RendererProps } from './types';

/** The middle of the quiz screen for one question. */
export function QuestionBody({ question, answer, act }: RendererProps<Question>) {
  switch (question.type) {
    case 'predict':
      return <Predict question={question} answer={answer} act={act} />;
    default:
      return null; // remaining types are added in Tasks 4–8
  }
}
```

Create `src/quiz/renderers/Predict.tsx`:

```tsx
import type { PredictQuestion } from '../../content';
import { CodePanel } from '../../components/CodePanel';
import { CssBox } from '../../components/CssBox';
import { tone, toneLabel } from '../tone';
import { ToneMark } from '../ToneMark';
import toneStyles from '../tone.module.css';
import type { RendererProps } from './types';
import styles from './Predict.module.css';

/** Read CSS, pick the picture. Every option is drawn with real CSS from the question data. */
export function Predict({ question: q, answer, act }: RendererProps<PredictQuestion>) {
  return (
    <>
      <CodePanel lines={q.code} label="CSS" />
      <div className={styles.grid}>
        {q.opts.map((o, i) => {
          const letter = String.fromCharCode(65 + i);
          const t = tone(answer.sel === i, i === q.answer, answer.checked);
          return (
            <button
              key={i}
              type="button"
              className={`${toneStyles.tile} ${toneStyles[t]} ${styles.tile}`}
              aria-pressed={answer.sel === i}
              aria-label={`Option ${letter}: ${o.d}${toneLabel(t)}`}
              onClick={() => act({ type: 'select', sel: i })}
            >
              <CssBox className={styles.stage} css={`${q.stage};${o.s}`}>
                {(o.kids ?? q.kids).map((k, j) => (
                  <CssBox key={j} css={k} />
                ))}
              </CssBox>
              <span className={styles.letter}>{letter}</span>
              <ToneMark tone={t} />
            </button>
          );
        })}
      </div>
    </>
  );
}
```

Create `src/quiz/renderers/Predict.module.css`:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  text-align: left;
}

/* Stage frame; the question's `stage` + option CSS is inline, so it can override these. */
.stage {
  height: 72px;
  padding: 6px;
  background: var(--bg);
  border: 1px dashed var(--line-strong);
  border-radius: 8px;
}

.letter {
  font-weight: 700;
  font-size: 15px;
}
```

- [ ] **Step 5: Add the feedback sheet and end screens**

Create `src/quiz/FeedbackSheet.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import type { Question } from '../content';
import { CheckCircleIcon, XCircleIcon } from '../components/icons';
import { RichText } from '../components/RichText';
import { feedbackText } from './feedback';
import type { AnswerState } from './types';
import styles from './FeedbackSheet.module.css';

interface Props {
  question: Question;
  answer: AnswerState;
  /** Queue position, for rotating praise. */
  index: number;
  onContinue: () => void;
}

/** Slides up after Check. Must be rendered inside an always-present aria-live region. */
export function FeedbackSheet({ question, answer, index, onContinue }: Props) {
  const { title, detail } = feedbackText(question, answer, index);
  const continueRef = useRef<HTMLButtonElement>(null);

  // Check just disappeared; keep keyboard focus in the flow.
  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  return (
    <section className={`${styles.sheet} ${answer.ok ? styles.ok : styles.bad}`} aria-label="Feedback">
      <div className={styles.head}>
        {answer.ok ? <CheckCircleIcon size={28} /> : <XCircleIcon size={28} />}
        <h2 className={styles.title}>{title}</h2>
      </div>
      {detail && <p className={styles.detail}>{detail}</p>}
      <p className={styles.explain}>
        <RichText text={question.explain} />
      </p>
      <button ref={continueRef} type="button" className={styles.continue} onClick={onContinue}>
        Continue
      </button>
    </section>
  );
}
```

Create `src/quiz/FeedbackSheet.module.css`:

```css
.sheet {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px var(--screen-pad) calc(28px + var(--safe-bottom));
  animation: slideup 0.18s ease-out;
}

.ok {
  --tone: var(--correct);
  --tone-edge: var(--correct-edge);
  background: var(--correct-bg);
}

.bad {
  --tone: var(--wrong);
  --tone-edge: var(--wrong-edge);
  background: var(--wrong-bg);
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--tone);
}

.title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  color: var(--tone);
}

.detail {
  font-size: 15px;
  font-weight: 700;
}

.explain {
  font-size: 15px;
  line-height: 1.45;
}

.continue {
  width: 100%;
  min-height: var(--button-h);
  border: 0;
  border-bottom: 5px solid var(--tone-edge);
  border-radius: var(--radius-tile);
  background: var(--tone);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Disabled under prefers-reduced-motion by the global rule in styles/global.css. */
@keyframes slideup {
  from {
    transform: translateY(24px);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
```

Create `src/quiz/QuizEnd.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { lessonName } from '../content';
import { Button } from '../components/Button';
import { BrokenHeartIcon, StarIcon } from '../components/icons';
import { accuracy } from './session';
import type { Session } from './types';
import styles from './QuizEnd.module.css';

function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

export function QuizDone({ session, onHome, onRetry }: { session: Session; onHome: () => void; onRetry: () => void }) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const perfect = session.firstTry === session.total;
  return (
    <div className={styles.screen}>
      <StarIcon />
      <div className={styles.titles}>
        <h1 ref={heading} tabIndex={-1} className={`${styles.title} ${styles.done}`}>
          Lesson complete!
        </h1>
        <p className={styles.sub}>{lessonName(session.lessonKey)}</p>
      </div>
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>XP</dt>
          <dd>+{session.xp}</dd>
        </div>
        <div className={styles.stat}>
          <dt>First try</dt>
          <dd>{accuracy(session)}%</dd>
        </div>
        <div className={styles.stat}>
          <dt>Hearts</dt>
          <dd className={styles.hearts}>{session.hearts}</dd>
        </div>
      </dl>
      <p className={styles.sub}>
        {perfect ? 'Perfect run — every answer right on the first try.' : 'Missed questions came back until you got them. That’s the point.'}
      </p>
      <div className={styles.actions}>
        <Button onClick={onHome}>Continue</Button>
        <Button variant="secondary" onClick={onRetry}>
          Practice again
        </Button>
      </div>
    </div>
  );
}

export function QuizOut({ onHome, onRetry }: { onHome: () => void; onRetry: () => void }) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  return (
    <div className={styles.screen}>
      <BrokenHeartIcon />
      <div className={styles.titles}>
        <h1 ref={heading} tabIndex={-1} className={`${styles.title} ${styles.out}`}>
          Out of hearts
        </h1>
        <p className={styles.sub}>Mistakes are how CSS sticks. Every question you missed will be waiting for you next run.</p>
      </div>
      <div className={styles.actions}>
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="secondary" onClick={onHome}>
          Back to home
        </Button>
      </div>
    </div>
  );
}
```

Create `src/quiz/QuizEnd.module.css`:

```css
.screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  height: 100%;
  padding: 32px 24px calc(32px + var(--safe-bottom));
  text-align: center;
}

.titles {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 32px;
}

.done {
  color: var(--primary);
}

.out {
  color: var(--wrong);
}

.sub {
  font-size: 16px;
  line-height: 1.45;
  color: var(--ink-muted);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  margin: 0;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 8px;
  background: var(--surface);
  border: 2px solid var(--line);
  border-radius: var(--radius-tile);
}

.stat dt {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.stat dd {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 26px;
}

.hearts {
  color: var(--wrong);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}
```

- [ ] **Step 6: Add the Quiz screen**

Create `src/quiz/Quiz.tsx`:

```tsx
import { useEffect, useReducer, useRef, type Dispatch } from 'react';
import { lessonQuestionIds, questionTypes, type LessonKey } from '../content';
import { Button } from '../components/Button';
import { HeartCount } from '../components/HeartCount';
import { CloseIcon } from '../components/icons';
import { ProgressBar } from '../components/ProgressBar';
import { FeedbackSheet } from './FeedbackSheet';
import { canCheck } from './grade';
import { QuizDone, QuizOut } from './QuizEnd';
import { QuestionBody } from './renderers/QuestionBody';
import { currentQuestion, sessionReducer, startSession, type SessionAction } from './session';
import type { Session } from './types';
import styles from './Quiz.module.css';

export interface QuizResult {
  lessonKey: LessonKey;
  xp: number;
}

interface Props {
  lessonKey: LessonKey;
  onExit: () => void;
  /** Called once per finished run (queue exhausted) — never for an out-of-hearts run. */
  onComplete: (result: QuizResult) => void;
}

export function Quiz({ lessonKey, onExit, onComplete }: Props) {
  const [session, dispatch] = useReducer(sessionReducer, lessonKey, (key) => startSession(key, lessonQuestionIds(key)));
  const restart = () => dispatch({ type: 'start', lessonKey, ids: lessonQuestionIds(lessonKey) });

  // A finished session never changes again (the reducer ignores everything but
  // 'start'), so remembering which one we reported makes this exactly-once.
  const reported = useRef<Session | null>(null);
  useEffect(() => {
    if (session.phase === 'done' && reported.current !== session) {
      reported.current = session;
      onComplete({ lessonKey: session.lessonKey, xp: session.xp });
    }
  }, [session, onComplete]);

  if (session.phase === 'done') return <QuizDone session={session} onHome={onExit} onRetry={restart} />;
  if (session.phase === 'out') return <QuizOut onHome={onExit} onRetry={restart} />;
  return <QuizQuestion session={session} dispatch={dispatch} onExit={onExit} />;
}

function QuizQuestion({ session, dispatch, onExit }: { session: Session; dispatch: Dispatch<SessionAction>; onExit: () => void }) {
  const q = currentQuestion(session)!; // phase 'question' guarantees a current question
  const a = session.answer;
  const promptRef = useRef<HTMLHeadingElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // New question: start at the top and announce its prompt.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    promptRef.current?.focus({ preventScroll: true });
  }, [session.idx]);

  const pct = session.total ? Math.round((session.solved / session.total) * 100) : 0;
  const hearts = session.hearts;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.close} aria-label="Quit lesson" onClick={onExit}>
          <CloseIcon />
        </button>
        <ProgressBar label="Lesson progress" value={pct} />
        <HeartCount count={hearts} label={`${hearts} ${hearts === 1 ? 'heart' : 'hearts'} left`} />
      </header>

      <div className={styles.titleBlock}>
        <span className={styles.typeChip}>{questionTypes.find((t) => t.key === q.type)?.name}</span>
        <h1 ref={promptRef} tabIndex={-1} className={styles.prompt}>
          {q.prompt}
        </h1>
      </div>

      <main ref={mainRef} className={styles.main}>
        <QuestionBody key={session.idx} question={q} answer={a} act={dispatch} />
      </main>

      <div className={styles.footer}>
        {!a.checked && q.type !== 'pairs' && (
          <div className={styles.bar}>
            <Button className={styles.check} disabled={!canCheck(q, a)} onClick={() => dispatch({ type: 'check' })}>
              Check
            </Button>
          </div>
        )}
        {!a.checked && q.type === 'pairs' && (
          <div className={`${styles.bar} ${styles.hint}`}>
            <p>Tap a property, then its result.</p>
            <span>
              {Object.keys(a.matched).length} / {q.items.length}
            </span>
          </div>
        )}
        <div aria-live="polite">
          {a.checked && <FeedbackSheet question={q} answer={a} index={session.idx} onContinue={() => dispatch({ type: 'next' })} />}
        </div>
      </div>
    </div>
  );
}
```

Create `src/quiz/Quiz.module.css`:

```css
.screen {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 8px;
  flex-shrink: 0;
}

.close {
  width: var(--touch);
  height: var(--touch);
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: transparent;
  border: 0;
  border-radius: var(--radius-chip);
  color: var(--ink-muted);
}

.titleBlock {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 6px var(--screen-pad) 0;
  flex-shrink: 0;
}

.typeChip {
  padding: 6px 10px;
  border-radius: var(--radius-pill);
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.prompt {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 24px;
  line-height: 1.15;
}

.main {
  flex-grow: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px var(--screen-pad) 16px;
}

.main > * {
  flex-shrink: 0;
}

.footer {
  flex-shrink: 0;
}

.bar {
  padding: 16px var(--screen-pad) calc(28px + var(--safe-bottom));
  border-top: 2px solid var(--line);
}

.check {
  width: 100%;
}

/* Disabled Check is flat grey rather than faded indigo. */
.check:disabled {
  opacity: 1;
  border-bottom-color: #d3ccbe;
  background: var(--line);
  color: #6f6b7b;
}

.hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  color: var(--ink-muted);
}

.hint span {
  font-weight: 700;
  color: var(--ink);
}
```

- [ ] **Step 7: Wire the quiz into the app and show total XP**

In `src/state/app.ts`:
- add `totalXp: number;` to `AppState` (after `completedSets`) with the doc comment `/** XP banked from finished practice runs. */`;
- add `| { type: 'completeQuiz'; lessonKey: LessonKey; xp: number }` to `Action`;
- add `totalXp: 0,` to `initialState`;
- add this case before `case 'goHome':`

```ts
    case 'completeQuiz':
      return {
        ...state,
        completedSets: { ...state.completedSets, [action.lessonKey]: true },
        totalXp: state.totalXp + action.xp,
      };
```

Replace `src/App.tsx`:

```tsx
import { useReducer } from 'react';
import { Quiz } from './quiz/Quiz';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { appReducer, initialState } from './state/app';
import styles from './App.module.css';

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { screen } = state;

  return (
    <div className={styles.frame}>
      {screen.name === 'home' && <Home state={state} dispatch={dispatch} />}
      {screen.name === 'learn' && (
        <Learn key={screen.unitKey} unitKey={screen.unitKey} card={screen.card} selection={screen.selection} dispatch={dispatch} />
      )}
      {screen.name === 'quiz' && (
        <Quiz
          key={screen.lessonKey}
          lessonKey={screen.lessonKey}
          onExit={() => dispatch({ type: 'goHome' })}
          onComplete={({ lessonKey, xp }) => dispatch({ type: 'completeQuiz', lessonKey, xp })}
        />
      )}
    </div>
  );
}
```

In `src/screens/Home.tsx`, replace `<HeartCount count={HEARTS_PER_LESSON} />` in the header with:

```tsx
          <div className={styles.stats}>
            <p className={styles.xp}>{state.totalXp} XP</p>
            <HeartCount count={HEARTS_PER_LESSON} />
          </div>
```

Append to `src/screens/Home.module.css`:

```css
.stats {
  display: flex;
  align-items: center;
  gap: 14px;
}

.xp {
  font-weight: 700;
  color: var(--primary);
}
```

Delete the placeholder:

```bash
git rm src/screens/QuizPlaceholder.tsx src/screens/QuizPlaceholder.module.css
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all test files PASS (content, lib, app, App, grade, session, Quiz); `tsc` prints nothing.

- [ ] **Step 9: Commit**

```bash
git add -A src
git commit -m "Add quiz screen, feedback sheet, end screens and predict questions" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Which rule wins? (versus) renderer

**Files:**
- Create: `src/quiz/renderers/Versus.tsx`, `src/quiz/renderers/Versus.module.css`
- Modify: `src/quiz/renderers/QuestionBody.tsx`
- Test: `src/quiz/renderers/Versus.test.tsx`

**Interfaces:**
- Consumes: `RendererProps<VersusQuestion>`, `tone`, `toneLabel`, `ToneMark`, `toneStyles`, `CodePanel`, `CssBox`, `renderQuiz`.
- Produces: `Versus` component.

- [ ] **Step 1: Write the failing test**

Create `src/quiz/renderers/Versus.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../testUtils';

describe('Which rule wins?', () => {
  it('draws each option in its own color and reveals specificity scores after checking', async () => {
    const { user } = renderQuiz('versus'); // versus-1: teal wins
    expect(screen.getByLabelText('CSS')).toHaveTextContent('#intro { color: teal; }');
    const teal = screen.getByRole('button', { name: 'teal' });
    expect(within(teal).getByText('Hello').style.color).toBe('teal');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'tomato' }));
    expect(screen.getByRole('button', { name: 'tomato' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Not quite — it’s teal');
    expect(screen.getByRole('button', { name: 'teal, correct answer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tomato, your answer, incorrect' })).toBeInTheDocument();
    const rows = within(screen.getByRole('table', { name: 'Specificity scores' })).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(/#intro.*1 · 0 · 0.*wins/);
    expect(rows[2]).not.toHaveTextContent('wins');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/quiz/renderers/Versus.test.tsx`
Expected: FAIL. It can't find the button named `teal`, because `QuestionBody` renders nothing for versus.

- [ ] **Step 3: Write the implementation**

Create `src/quiz/renderers/Versus.tsx`:

```tsx
import type { VersusQuestion } from '../../content';
import { CodePanel } from '../../components/CodePanel';
import { CssBox } from '../../components/CssBox';
import { tone, toneLabel } from '../tone';
import { ToneMark } from '../ToneMark';
import toneStyles from '../tone.module.css';
import type { RendererProps } from './types';
import styles from './Versus.module.css';

/** Pick the color the cascade produces; the reveal shows each rule's specificity. */
export function Versus({ question: q, answer, act }: RendererProps<VersusQuestion>) {
  const big = q.opts.length <= 2;
  return (
    <>
      <CodePanel lines={q.code} label="CSS" />
      <div className={styles.options} style={{ gridTemplateColumns: `repeat(${q.opts.length}, minmax(0, 1fr))` }}>
        {q.opts.map((color) => {
          const t = tone(answer.sel === color, color === q.answer, answer.checked);
          return (
            <button
              key={color}
              type="button"
              className={`${toneStyles.tile} ${toneStyles[t]} ${styles.option}`}
              aria-pressed={answer.sel === color}
              aria-label={`${color}${toneLabel(t)}`}
              onClick={() => act({ type: 'select', sel: color })}
            >
              <CssBox as="span" className={big ? styles.helloBig : styles.hello} css={`color:${color}`}>
                Hello
              </CssBox>
              <span className={styles.name}>{color}</span>
              <ToneMark tone={t} />
            </button>
          );
        })}
      </div>
      {answer.checked && (
        <table className={styles.scores}>
          <caption className="sr-only">Specificity scores</caption>
          <thead>
            <tr>
              <th scope="col">Rule</th>
              <th scope="col">ID · Class · Tag</th>
              <th scope="col">
                <span className="sr-only">Result</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {q.scores.map((r) => (
              <tr key={r.sel}>
                <td>{r.sel}</td>
                <td>{r.score}</td>
                <td>{r.win && <span className={styles.wins}>wins</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
```

Create `src/quiz/renderers/Versus.module.css`:

```css
.options {
  display: grid;
  gap: 12px;
}

.option {
  height: 104px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 4px;
}

.hello,
.helloBig {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 24px;
}

.helloBig {
  font-size: 32px;
}

.name {
  font-family: var(--font-code);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.scores {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--surface);
  border: 2px solid var(--line);
  border-radius: var(--radius-tile);
  overflow: hidden;
  font-family: var(--font-code);
  font-size: 13px;
  text-align: left;
}

.scores th {
  padding: 8px 14px;
  background: var(--surface-muted);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.scores td {
  padding: 9px 14px;
  border-top: 1px solid var(--line);
}

.wins {
  display: inline-block;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: var(--correct);
  color: #fff;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
}
```

In `src/quiz/renderers/QuestionBody.tsx`, add `import { Versus } from './Versus';` and this case after `predict`:

```tsx
    case 'versus':
      return <Versus question={question} answer={answer} act={act} />;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/quiz/renderers
git commit -m "Add Which rule wins? question renderer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Match pairs renderer (auto-complete, 700 ms mismatch flash)

**Files:**
- Create: `src/quiz/renderers/Pairs.tsx`, `src/quiz/renderers/Pairs.module.css`
- Modify: `src/quiz/renderers/QuestionBody.tsx`
- Test: `src/quiz/renderers/Pairs.test.tsx`

**Interfaces:**
- Consumes: `RendererProps<PairsQuestion>`, `PAIR_MISS_FLASH_MS`, `ToneMark`, `toneStyles`, `CssBox`, `renderQuiz`, `AnswerState`.
- Produces: `Pairs` component.

- [ ] **Step 1: Write the failing test**

Create `src/quiz/renderers/Pairs.test.tsx`:

```tsx
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderQuiz } from '../testUtils';

// pairs-1: a "opacity: .4" ↔ "Faded square", b "border-radius: 50%" ↔ "Circle",
//          c "rotate: 45deg" ↔ "Tilted square", d "scale: .5" ↔ "Half-size square"
const PAIRS: [string, string][] = [
  ['opacity: .4', 'Faded square'],
  ['border-radius: 50%', 'Circle'],
  ['rotate: 45deg', 'Tilted square'],
  ['scale: .5', 'Half-size square'],
];
const btn = (name: string) => screen.getByRole('button', { name });

describe('Match pairs', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const setup = () => renderQuiz('pairs', { advanceTimers: vi.advanceTimersByTime });

  it('flashes a mismatch for 700 ms without costing a heart', async () => {
    const { user } = setup();
    await user.click(btn('opacity: .4'));
    expect(btn('opacity: .4')).toHaveAttribute('aria-pressed', 'true');
    await user.click(btn('Circle'));
    expect(btn('opacity: .4, not a match')).toBeInTheDocument();
    expect(btn('Circle, not a match')).toBeInTheDocument();
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(btn('opacity: .4')).toHaveAttribute('aria-pressed', 'false');
    expect(btn('Circle')).toBeInTheDocument();
  });

  it('keeps a newer pick when an old mismatch flash expires', async () => {
    const { user } = setup();
    await user.click(btn('opacity: .4'));
    await user.click(btn('Circle'));
    await user.click(btn('rotate: 45deg'));
    expect(screen.queryByRole('button', { name: /not a match/ })).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(btn('rotate: 45deg')).toHaveAttribute('aria-pressed', 'true');
  });

  it('auto-completes when all four pairs match, with no Check button', async () => {
    const { user } = setup();
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    expect(screen.getByText('Tap a property, then its result.')).toBeInTheDocument();
    for (const [code, label] of PAIRS.slice(0, 2)) {
      await user.click(btn(code));
      await user.click(btn(label));
    }
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
    expect(btn('opacity: .4, matched')).toBeDisabled();
    for (const [code, label] of PAIRS.slice(2)) {
      await user.click(btn(code));
      await user.click(btn(label));
    }
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('All pairs matched!');
    expect(sheet).toHaveTextContent('Flawless — no mismatches.');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/quiz/renderers/Pairs.test.tsx`
Expected: FAIL. It can't find the button named `opacity: .4`.

- [ ] **Step 3: Write the implementation**

Create `src/quiz/renderers/Pairs.tsx`:

```tsx
import { useEffect } from 'react';
import type { PairsQuestion } from '../../content';
import { CssBox } from '../../components/CssBox';
import { PAIR_MISS_FLASH_MS } from '../../state/rules';
import { ToneMark } from '../ToneMark';
import toneStyles from '../tone.module.css';
import type { AnswerState } from '../types';
import type { RendererProps } from './types';
import styles from './Pairs.module.css';

type PairTone = 'idle' | 'selected' | 'wrong' | 'done';

function pairTone(a: AnswerState, id: string, side: 'left' | 'right'): PairTone {
  if (a.matched[id]) return 'done';
  if (a.miss?.[side] === id) return 'wrong';
  if (a[side] === id) return 'selected';
  return 'idle';
}

const SUFFIX: Record<PairTone, string> = { idle: '', selected: '', wrong: ', not a match', done: ', matched' };

/** Tap a property, then what it draws. Checks on every pair; never costs hearts. */
export function Pairs({ question: q, answer, act }: RendererProps<PairsQuestion>) {
  // Clear the mismatch highlight after a moment. A newer pick clears `miss`
  // first, which cancels this timer.
  useEffect(() => {
    if (!answer.miss) return;
    const timer = setTimeout(() => act({ type: 'clearMiss' }), PAIR_MISS_FLASH_MS);
    return () => clearTimeout(timer);
  }, [answer.miss, act]);

  const byId = new Map(q.items.map((it) => [it.id, it]));
  const tileClass = (t: PairTone) =>
    `${toneStyles.tile} ${t === 'done' ? styles.done : toneStyles[t]} ${styles.tile}`;
  const mark = (t: PairTone) => <ToneMark tone={t === 'done' ? 'correct' : t === 'wrong' ? 'wrong' : 'idle'} />;

  return (
    <div className={styles.columns}>
      <div className={styles.column} role="group" aria-label="Properties">
        {q.items.map((it) => {
          const t = pairTone(answer, it.id, 'left');
          return (
            <button
              key={it.id}
              type="button"
              className={`${tileClass(t)} ${styles.code}`}
              disabled={t === 'done'}
              aria-pressed={t === 'selected'}
              aria-label={`${it.code}${SUFFIX[t]}`}
              onClick={() => act({ type: 'pickPair', side: 'left', id: it.id })}
            >
              {it.code}
              {mark(t)}
            </button>
          );
        })}
      </div>
      <div className={styles.column} role="group" aria-label="Results">
        {q.order.map((id) => {
          const it = byId.get(id)!;
          const t = pairTone(answer, id, 'right');
          return (
            <button
              key={id}
              type="button"
              className={tileClass(t)}
              disabled={t === 'done'}
              aria-pressed={t === 'selected'}
              aria-label={`${it.label}${SUFFIX[t]}`}
              onClick={() => act({ type: 'pickPair', side: 'right', id })}
            >
              <CssBox css={it.shape}>{it.text}</CssBox>
              {mark(t)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

Create `src/quiz/renderers/Pairs.module.css`:

```css
.columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tile {
  min-height: 76px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
}

.code {
  font-family: var(--font-code);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  line-height: 1.35;
}

.tile.done {
  border-color: var(--line);
  background: var(--surface-muted);
  opacity: 0.45;
}
```

In `src/quiz/renderers/QuestionBody.tsx`, add `import { Pairs } from './Pairs';` and:

```tsx
    case 'pairs':
      return <Pairs question={question} answer={answer} act={act} />;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/quiz/renderers
git commit -m "Add Match pairs question renderer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Word bank (build) renderer

**Files:**
- Create: `src/quiz/renderers/Build.tsx`, `src/quiz/renderers/Build.module.css`, `src/quiz/renderers/preview.module.css`
- Modify: `src/quiz/renderers/QuestionBody.tsx`
- Test: `src/quiz/renderers/Build.test.tsx`

**Interfaces:**
- Consumes: `RendererProps<BuildQuestion>`, `buildPreview`, `BuildPreview`, `CodeTokens`, `CssBox`, `renderQuiz`.
- Produces: `Build` component; `preview.module.css` classes `pair figure caption`, reused by Task 8.

- [ ] **Step 1: Write the failing test**

Create `src/quiz/renderers/Build.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../testUtils';

// build-1: .box { display: [grid]; place-items: [center]; } — bank: flex grid center middle block start
const btn = (name: string) => screen.getByRole('button', { name });

describe('Word bank', () => {
  it('fills blanks from the bank, previews live, and clears a blank on tap', async () => {
    const { user } = renderQuiz('build');
    expect(screen.getByTestId('build-goal').style.display).toBe('grid');
    expect(btn('Blank 1, empty')).toBeInTheDocument();
    expect(btn('Check')).toBeDisabled();

    await user.click(btn('flex'));
    expect(btn('flex, placed')).toBeDisabled();
    expect(btn('Blank 1: flex. Tap to remove')).toBeInTheDocument();
    expect(screen.getByTestId('build-yours').style.display).toBe('flex');

    await user.click(btn('Blank 1: flex. Tap to remove'));
    expect(btn('flex')).toBeEnabled();
    expect(screen.getByTestId('build-yours').style.display).toBe('block'); // the default

    await user.click(btn('grid'));
    await user.click(btn('center'));
    await user.click(btn('Check'));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
  });

  it('shows the full answer when wrong', async () => {
    const { user } = renderQuiz('build');
    await user.click(btn('flex'));
    await user.click(btn('center'));
    await user.click(btn('Check'));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Answer: display: grid; place-items: center;');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/quiz/renderers/Build.test.tsx`
Expected: FAIL. `Unable to find an element by: [data-testid="build-goal"]`.

- [ ] **Step 3: Write the implementation**

Create `src/quiz/renderers/preview.module.css`:

```css
/* Side-by-side labeled previews: Goal / Yours, Expected / Actual. */
.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.caption {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-muted);
}
```

Create `src/quiz/renderers/Build.tsx`:

```tsx
import type { BuildQuestion } from '../../content';
import { CodeTokens } from '../../components/CodePanel';
import { CssBox } from '../../components/CssBox';
import { buildPreview, type BuildPreview } from '../previews';
import type { RendererProps } from './types';
import preview from './preview.module.css';
import styles from './Build.module.css';

/** Fill the blanks from a word bank; "Yours" renders wrong picks too. Chips are tracked by bank index. */
export function Build({ question: q, answer, act }: RendererProps<BuildQuestion>) {
  const words = answer.slots.map((ci) => (ci === null ? null : (q.bank[ci] ?? null)));

  return (
    <>
      <div className={preview.pair}>
        <Preview label="Goal" preview={buildPreview(q, q.answer)} testId="build-goal" />
        <Preview label="Yours (live)" preview={buildPreview(q, words)} testId="build-yours" />
      </div>

      <div className={styles.code}>
        {q.code.map((line, i) => {
          if (typeof line === 'string') {
            return (
              <div key={i} className={styles.line}>
                <CodeTokens line={line} />
              </div>
            );
          }
          const n = line.slot + 1;
          const word = words[line.slot] ?? null;
          return (
            <div key={i} className={styles.slotLine}>
              <span className={styles.prop}>{q.props[line.slot]}</span>:
              <button
                type="button"
                className={word ? styles.filled : styles.empty}
                disabled={answer.checked}
                aria-label={word ? `Blank ${n}: ${word}. Tap to remove` : `Blank ${n}, empty`}
                onClick={() => act({ type: 'clearSlot', slot: line.slot })}
              >
                {word}
              </button>
              ;
            </div>
          );
        })}
      </div>

      <div className={styles.bank} role="group" aria-label="Word bank">
        {q.bank.map((word, ci) => {
          const used = answer.slots.includes(ci);
          return (
            <button
              key={ci}
              type="button"
              className={used ? styles.used : styles.chip}
              disabled={used || answer.checked}
              aria-label={used ? `${word}, placed` : word}
              onClick={() => act({ type: 'placeWord', bankIndex: ci })}
            >
              {word}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Preview({ label, preview: p, testId }: { label: string; preview: BuildPreview; testId: string }) {
  return (
    <figure className={preview.figure}>
      <figcaption className={preview.caption}>{label}</figcaption>
      <CssBox css={p.box} data-testid={testId}>
        {p.kids.map((k, i) => (
          <CssBox key={i} css={k.s}>
            {k.t}
          </CssBox>
        ))}
      </CssBox>
    </figure>
  );
}
```

Create `src/quiz/renderers/Build.module.css`:

```css
.code {
  padding: 10px 16px;
  background: var(--ink);
  border-radius: var(--radius-tile);
  font-family: var(--font-code);
  font-size: 13px;
  line-height: 1.7;
  color: var(--code-punct);
}

.line {
  white-space: pre;
}

.slotLine {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding-left: 2ch;
}

.prop {
  color: var(--code-property);
}

.empty,
.filled {
  min-width: 88px;
  height: var(--touch);
  margin: 0 4px;
  border-radius: 8px;
  font-family: var(--font-code);
  font-size: 13px;
  font-weight: 600;
}

.empty {
  border: 2px dashed #7c7896;
  background: transparent;
}

.filled {
  padding: 0 10px;
  border: 2px solid var(--code-value);
  background: var(--code-value);
  color: var(--ink);
}

.bank {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.chip,
.used {
  min-height: var(--touch);
  padding: 0 14px;
  border-radius: var(--radius-chip);
  font-family: var(--font-code);
  font-size: 14px;
  font-weight: 600;
}

.chip {
  border: 2px solid var(--ink);
  border-bottom-width: 4px;
  background: var(--surface);
  color: var(--ink);
}

/* A placed chip leaves a ghost so the bank doesn't reflow. */
.used {
  border: 2px solid var(--line);
  background: var(--line);
  color: transparent;
}
```

In `src/quiz/renderers/QuestionBody.tsx`, add `import { Build } from './Build';` and:

```tsx
    case 'build':
      return <Build question={question} answer={answer} act={act} />;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/quiz/renderers
git commit -m "Add Word bank question renderer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Tune to target renderer

**Files:**
- Create: `src/quiz/renderers/Tune.tsx`, `src/quiz/renderers/Tune.module.css`
- Modify: `src/quiz/renderers/QuestionBody.tsx`
- Test: `src/quiz/renderers/Tune.test.tsx`

**Interfaces:**
- Consumes: `RendererProps<TuneQuestion>`, `tuneLayer`, `TuneLayer`, `MinusIcon`, `PlusIcon`, `CssBox`, `renderQuiz`.
- Produces: `Tune` component.

- [ ] **Step 1: Write the failing test**

Create `src/quiz/renderers/Tune.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../testUtils';

// tune-1: gap on the row, start 8px, target 24px, step 4, range 0–48
const btn = (name: string) => screen.getByRole('button', { name });

describe('Tune to target', () => {
  it('steps the value, redraws your row live, and grades against the target', async () => {
    const { user } = renderQuiz('tune');
    expect(screen.getByText('8px')).toBeInTheDocument();
    expect(screen.getByTestId('tune-ghost').style.gap).toBe('24px');
    expect(screen.getByTestId('tune-yours').style.gap).toBe('8px');

    for (let i = 0; i < 4; i++) await user.click(btn('Increase value'));
    expect(screen.getByText('24px')).toBeInTheDocument();
    expect(screen.getByTestId('tune-yours').style.gap).toBe('24px');

    await user.click(btn('Check'));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
    expect(btn('Increase value')).toBeDisabled();
  });

  it('disables decrease at the minimum', async () => {
    const { user } = renderQuiz('tune');
    await user.click(btn('Decrease value'));
    await user.click(btn('Decrease value'));
    expect(screen.getByText('0px')).toBeInTheDocument();
    expect(btn('Decrease value')).toBeDisabled();
  });

  it('explains the difference when wrong', async () => {
    const { user } = renderQuiz('tune');
    await user.click(btn('Check'));
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('Close, but not aligned');
    expect(sheet).toHaveTextContent('You set 8px — the target is 24px.');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/quiz/renderers/Tune.test.tsx`
Expected: FAIL. `Unable to find an element with the text: 8px`.

- [ ] **Step 3: Write the implementation**

Create `src/quiz/renderers/Tune.tsx`:

```tsx
import type { TuneQuestion } from '../../content';
import { CssBox } from '../../components/CssBox';
import { MinusIcon, PlusIcon } from '../../components/icons';
import { tuneLayer, type TuneLayer } from '../previews';
import type { RendererProps } from './types';
import styles from './Tune.module.css';

/** Nudge a value until your boxes fill the dashed ghost target. */
export function Tune({ question: q, answer, act }: RendererProps<TuneQuestion>) {
  const decOff = answer.checked || answer.num <= q.min;
  const incOff = answer.checked || answer.num >= q.max;

  const layer = (l: TuneLayer, testId: string) => (
    <CssBox className={styles.row} css={l.row} data-testid={testId}>
      {Array.from({ length: q.count }, (_, i) => (
        <CssBox key={i} css={l.kid}>
          {q.text}
        </CssBox>
      ))}
    </CssBox>
  );

  return (
    <>
      {/* Purely visual; the value readout below carries the state for screen readers. */}
      <div className={styles.stage} aria-hidden="true">
        {layer(tuneLayer(q, q.ghost, q.target), 'tune-ghost')}
        {layer(tuneLayer(q, q.yours, answer.num), 'tune-yours')}
      </div>
      <ul className={styles.legend} aria-hidden="true">
        <li>
          <span className={styles.target} />
          Target
        </li>
        <li>
          <span className={styles.yours} />
          Yours
        </li>
      </ul>
      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.step}
          aria-label="Decrease value"
          disabled={decOff}
          onClick={() => act({ type: 'step', dir: -1 })}
        >
          <MinusIcon />
        </button>
        <output className={styles.value} aria-live="polite">
          <span className={styles.prop}>{q.prop}</span>: <span className={styles.val}>{`${answer.num}${q.unit}`}</span>;
        </output>
        <button
          type="button"
          className={styles.step}
          aria-label="Increase value"
          disabled={incOff}
          onClick={() => act({ type: 'step', dir: 1 })}
        >
          <PlusIcon />
        </button>
      </div>
    </>
  );
}
```

Create `src/quiz/renderers/Tune.module.css`:

```css
.stage {
  position: relative;
  height: 170px;
  background: var(--surface);
  border: 2px solid var(--line);
  border-radius: var(--radius-tile);
  overflow: hidden;
}

/* Ghost and yours are stacked exactly on top of each other. */
.row {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.legend {
  display: flex;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: var(--ink-muted);
}

.legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.target,
.yours {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}

.target {
  border: 2px dashed var(--primary);
}

.yours {
  background: var(--accent);
}

.stepper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--surface);
  border: 2px solid var(--ink);
  border-bottom-width: 5px;
  border-radius: var(--radius-tile);
  color: var(--ink);
}

.step:disabled {
  opacity: 0.4;
}

.value {
  flex-grow: 1;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ink);
  border-radius: var(--radius-tile);
  font-family: var(--font-code);
  font-size: 16px;
  color: var(--code-punct);
  white-space: pre;
}

.prop {
  color: var(--code-property);
}

.val {
  color: var(--code-value);
}
```

In `src/quiz/renderers/QuestionBody.tsx`, add `import { Tune } from './Tune';` and:

```tsx
    case 'tune':
      return <Tune question={question} answer={answer} act={act} />;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/quiz/renderers
git commit -m "Add Tune to target question renderer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Spot the bug and Type the value renderers

**Files:**
- Create: `src/quiz/renderers/Bug.tsx`, `src/quiz/renderers/Bug.module.css`, `src/quiz/renderers/TypeValue.tsx`, `src/quiz/renderers/TypeValue.module.css`
- Modify: `src/quiz/renderers/QuestionBody.tsx` (final, exhaustive switch)
- Test: `src/quiz/renderers/Bug.test.tsx`, `src/quiz/renderers/TypeValue.test.tsx`

**Interfaces:**
- Consumes: `RendererProps<BugQuestion | TypeQuestion>`, `tone`, `toneLabel`, `ToneMark`, `CodeTokens`, `CssBox`, `typePreviewCss`, `preview.module.css`, `renderQuiz`.
- Produces: `Bug`, `TypeValue` components; `QuestionBody` covers all 7 types.

- [ ] **Step 1: Write the failing tests**

Create `src/quiz/renderers/Bug.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../testUtils';

// bug-1: line 4 "border-radius: 12px" is missing its semicolon
describe('Spot the bug', () => {
  it('shows expected vs actual, picks a line, and reveals the right line when wrong', async () => {
    const { user } = renderQuiz('bug');
    expect(screen.getByText('Expected')).toBeInTheDocument();
    expect(screen.getByText('Actual')).toBeInTheDocument();

    const line2 = screen.getByRole('button', { name: 'Line 2: padding: 16px;' });
    await user.click(line2);
    expect(line2).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Not that one — it’s line 4');
    expect(screen.getByRole('button', { name: 'Line 4: border-radius: 12px, correct answer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Line 2: padding: 16px;, your answer, incorrect' })).toBeInTheDocument();
    expect(screen.getByText('4 hearts left')).toBeInTheDocument();
  });
});
```

Create `src/quiz/renderers/TypeValue.test.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../testUtils';

// type-1: .headline { text-transform: uppercase; }
describe('Type the value', () => {
  it('previews sanitized input live and checks on Enter', async () => {
    const { user } = renderQuiz('type');
    const input = screen.getByLabelText('text-transform');
    const preview = screen.getByTestId('type-preview');
    expect(preview.style.textTransform).toBe('initial');

    await user.type(input, 'UPPER');
    expect(preview.style.textTransform).toBe(''); // "upper" is not a valid value, so the browser drops it
    await user.type(input, 'CASE');
    expect(preview.style.textTransform).toBe('uppercase');

    await user.type(input, '{Enter}');
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
    expect(input).toBeDisabled();
  });

  it('keeps typed punctuation out of the preview CSS', async () => {
    const { user } = renderQuiz('type');
    await user.type(screen.getByLabelText('text-transform'), 'red;color:blue');
    expect(screen.getByTestId('type-preview').getAttribute('style') ?? '').not.toContain('blue');
  });

  it('does nothing on Enter with an empty answer', async () => {
    const { user } = renderQuiz('type');
    await user.type(screen.getByLabelText('text-transform'), '{Enter}');
    expect(screen.queryByRole('region', { name: 'Feedback' })).not.toBeInTheDocument();
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/quiz/renderers/Bug.test.tsx src/quiz/renderers/TypeValue.test.tsx`
Expected: FAIL. `Unable to find an element with the text: Expected` and `Unable to find a label with the text of: text-transform`.

- [ ] **Step 3: Write the implementation**

Create `src/quiz/renderers/Bug.tsx`:

```tsx
import type { BugQuestion } from '../../content';
import { CodeTokens } from '../../components/CodePanel';
import { CssBox } from '../../components/CssBox';
import { tone, toneLabel } from '../tone';
import { ToneMark } from '../ToneMark';
import type { RendererProps } from './types';
import preview from './preview.module.css';
import styles from './Bug.module.css';

/** Compare expected vs actual, then tap the line that silently fails. */
export function Bug({ question: q, answer, act }: RendererProps<BugQuestion>) {
  return (
    <>
      <div className={preview.pair}>
        {(
          [
            ['Expected', q.expected],
            ['Actual', q.actual],
          ] as const
        ).map(([label, shot]) => (
          <figure key={label} className={preview.figure}>
            <figcaption className={preview.caption}>{label}</figcaption>
            <CssBox css={q.stage}>
              <CssBox css={shot.s}>{shot.t}</CssBox>
            </CssBox>
          </figure>
        ))}
      </div>
      <div className={styles.lines} role="group" aria-label="Code lines">
        {q.code.map((line, i) => {
          const n = i + 1;
          const t = tone(answer.sel === n, n === q.answer, answer.checked);
          return (
            <button
              key={n}
              type="button"
              className={`${styles.line} ${styles[t]}`}
              aria-pressed={answer.sel === n}
              aria-label={`Line ${n}: ${line.trim()}${toneLabel(t)}`}
              onClick={() => act({ type: 'select', sel: n })}
            >
              <span className={styles.num} aria-hidden="true">
                {n}
              </span>
              <span className={styles.code}>
                <CodeTokens line={line} />
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

Create `src/quiz/renderers/Bug.module.css`:

```css
.lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: var(--ink);
  border-radius: var(--radius-tile);
}

.line {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: var(--touch);
  padding: 0 36px 0 10px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  font-family: var(--font-code);
  font-size: 13px;
  color: var(--code-punct);
}

/* Dark-panel tones (the light ones live in tone.module.css). */
.idle {
  border-color: transparent;
}

.selected {
  border-color: var(--code-property);
  background: #34305a;
}

.correct {
  border-color: #4ade80;
  background: rgb(21 128 61 / 0.35);
}

.wrong {
  border-color: #fb923c;
  background: rgb(180 70 27 / 0.4);
}

.num {
  width: 2ch;
  flex-shrink: 0;
  color: var(--ink-faint);
  text-align: right;
}

.code {
  white-space: pre;
}
```

Create `src/quiz/renderers/TypeValue.tsx`:

```tsx
import { useId } from 'react';
import type { TypeQuestion } from '../../content';
import { CssBox } from '../../components/CssBox';
import { typePreviewCss } from '../previews';
import type { RendererProps } from './types';
import preview from './preview.module.css';
import styles from './TypeValue.module.css';

/** Free recall: type the value; the preview applies the sanitized keyword live. */
export function TypeValue({ question: q, answer, act }: RendererProps<TypeQuestion>) {
  const inputId = useId();
  return (
    <>
      <figure className={preview.figure}>
        <figcaption className={preview.caption}>Live preview</figcaption>
        <div className={styles.preview}>
          <CssBox as="span" css={typePreviewCss(q, answer.val)} data-testid="type-preview">
            {q.text}
          </CssBox>
        </div>
      </figure>
      <div className={styles.code}>
        <div>
          <span className={styles.sel}>{q.sel}</span> {'{'}
        </div>
        <div className={styles.inputLine}>
          <label htmlFor={inputId} className={styles.prop}>
            {q.prop}
          </label>
          :
          <input
            id={inputId}
            className={styles.input}
            type="text"
            value={answer.val}
            disabled={answer.checked}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="value"
            onChange={(e) => act({ type: 'input', val: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                act({ type: 'check' });
              }
            }}
          />
          ;
        </div>
        <div>{'}'}</div>
      </div>
      <p className={styles.help}>No options this time — type it from memory. Press Enter to check.</p>
    </>
  );
}
```

Create `src/quiz/renderers/TypeValue.module.css`:

```css
.preview {
  height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  background: var(--surface);
  border: 2px solid var(--line);
  border-radius: var(--radius-tile);
}

.code {
  padding: 12px 16px;
  background: var(--ink);
  color: var(--code-punct);
  border-radius: var(--radius-tile);
  font-family: var(--font-code);
  font-size: 14px;
  line-height: 1.65;
}

.sel {
  color: var(--code-selector);
}

.inputLine {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 52px;
  padding-left: 2ch;
}

.prop {
  color: var(--code-property);
}

.input {
  width: 140px;
  height: var(--touch);
  padding: 0 10px;
  background: #2a2740;
  border: 2px solid #7c7896;
  border-radius: 8px;
  color: var(--code-value);
  font-family: var(--font-code);
  font-size: 15px;
}

.input::placeholder {
  color: var(--code-html);
}

.help {
  font-size: 14px;
  color: var(--ink-muted);
}
```

Replace `src/quiz/renderers/QuestionBody.tsx` with the final exhaustive version:

```tsx
import type { Question } from '../../content';
import { Bug } from './Bug';
import { Build } from './Build';
import { Pairs } from './Pairs';
import { Predict } from './Predict';
import { Tune } from './Tune';
import { TypeValue } from './TypeValue';
import type { RendererProps } from './types';
import { Versus } from './Versus';

/** The middle of the quiz screen for one question. */
export function QuestionBody({ question, answer, act }: RendererProps<Question>) {
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS; `tsc` prints nothing (the switch is now exhaustive).

- [ ] **Step 5: Commit**

```bash
git add src/quiz/renderers
git commit -m "Add Spot the bug and Type the value question renderers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Persist completed units, completed sets and total XP

**Files:**
- Create: `src/storage/progress.ts`
- Modify: `src/App.tsx`, `src/test/setup.ts`
- Test: `src/storage/progress.test.ts`, `src/App.test.tsx` (new `describe('Persistence')`)

**Interfaces:**
- Consumes: `AppState` fields `completedUnits`, `completedSets`, `totalXp` (Task 3); `LessonKey`.
- Produces:
  - `interface Progress { completedUnits: Record<string, true>; completedSets: Partial<Record<LessonKey, true>>; totalXp: number }`;
  - `interface ProgressStore { load(): Progress; save(p: Progress): void }`;
  - `STORAGE_KEY = 'cascade.progress.v1'`;
  - `emptyProgress(): Progress`;
  - `parseProgress(raw: string | null): Progress`;
  - `localProgressStore(getStorage?: () => Storage | undefined): ProgressStore`;
  - `App` accepts an optional `store?: ProgressStore` prop.

- [ ] **Step 1: Write the failing tests**

Create `src/storage/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { emptyProgress, localProgressStore, parseProgress, STORAGE_KEY } from './progress';

describe('parseProgress', () => {
  it('returns empty progress for missing or corrupt data', () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress('{not json')).toEqual(emptyProgress());
    expect(parseProgress('"a string"')).toEqual(emptyProgress());
    expect(parseProgress('null')).toEqual(emptyProgress());
  });

  it('keeps only well-formed fields', () => {
    const raw = JSON.stringify({ completedUnits: { box: true, flex: 'yes' }, completedSets: ['bug'], totalXp: 'lots' });
    expect(parseProgress(raw)).toEqual({ completedUnits: { box: true }, completedSets: {}, totalXp: 0 });
    expect(parseProgress(JSON.stringify({ totalXp: 42.7 })).totalXp).toBe(42);
    expect(parseProgress(JSON.stringify({ totalXp: -5 })).totalXp).toBe(0);
  });
});

describe('localProgressStore', () => {
  it('round-trips through localStorage under a versioned key', () => {
    const store = localProgressStore();
    const progress = { completedUnits: { grid: true as const }, completedSets: { 'topic:grid': true as const }, totalXp: 25 };
    store.save(progress);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(progress);
    expect(store.load()).toEqual(progress);
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

Append to `src/App.test.tsx` (add `STORAGE_KEY` import: `import { STORAGE_KEY } from './storage/progress';`):

```tsx
describe('Persistence', () => {
  it('restores completed units and XP from storage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedUnits: { basics: true }, completedSets: {}, totalXp: 40 }));
    render(<App />);
    expect(screen.getByText('40 XP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How CSS works, 3 cards, completed' })).toBeInTheDocument();
    expect(screen.getByText('Up next')).toBeInTheDocument();
  });

  it('saves progress when a unit is finished', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Grid basics, 4 cards' }));
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ completedUnits: { grid: true }, totalXp: 0 });
  });

  it('starts fresh when stored progress is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    render(<App />);
    expect(screen.getByText('0 XP')).toBeInTheDocument();
    expect(screen.getByText('Start here')).toBeInTheDocument();
  });
});
```

Replace `src/test/setup.ts` so every test starts with empty storage:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/storage src/App.test.tsx`
Expected: FAIL. `Failed to resolve import "./progress"` / `"./storage/progress"`.

- [ ] **Step 3: Write the implementation**

Create `src/storage/progress.ts`:

```ts
// Learner progress persistence. Everything goes through ProgressStore so a
// backend can replace localStorage without touching the app.
import type { LessonKey } from '../content';

export interface Progress {
  completedUnits: Record<string, true>;
  completedSets: Partial<Record<LessonKey, true>>;
  totalXp: number;
}

export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): void;
}

export const STORAGE_KEY = 'cascade.progress.v1';

export const emptyProgress = (): Progress => ({ completedUnits: {}, completedSets: {}, totalXp: 0 });

function trueKeys(value: unknown): Record<string, true> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v === true)
      .map(([k]) => [k, true as const]),
  );
}

/** Parse stored progress. Missing, malformed or foreign data becomes empty progress; never throws. */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyProgress();
  const d = data as Record<string, unknown>;
  const xp = d.totalXp;
  return {
    completedUnits: trueKeys(d.completedUnits),
    completedSets: trueKeys(d.completedSets) as Partial<Record<LessonKey, true>>,
    totalXp: typeof xp === 'number' && Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0,
  };
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
        return parseProgress(getStorage()?.getItem(STORAGE_KEY) ?? null);
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

Replace `src/App.tsx`:

```tsx
import { useEffect, useReducer } from 'react';
import { Quiz } from './quiz/Quiz';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { appReducer, initialState } from './state/app';
import { localProgressStore, type ProgressStore } from './storage/progress';
import styles from './App.module.css';

const defaultStore = localProgressStore();

export function App({ store = defaultStore }: { store?: ProgressStore }) {
  const [state, dispatch] = useReducer(appReducer, store, (s) => ({ ...initialState, ...s.load() }));
  const { screen, completedUnits, completedSets, totalXp } = state;

  useEffect(() => {
    store.save({ completedUnits, completedSets, totalXp });
  }, [store, completedUnits, completedSets, totalXp]);

  return (
    <div className={styles.frame}>
      {screen.name === 'home' && <Home state={state} dispatch={dispatch} />}
      {screen.name === 'learn' && (
        <Learn key={screen.unitKey} unitKey={screen.unitKey} card={screen.card} selection={screen.selection} dispatch={dispatch} />
      )}
      {screen.name === 'quiz' && (
        <Quiz
          key={screen.lessonKey}
          lessonKey={screen.lessonKey}
          onExit={() => dispatch({ type: 'goHome' })}
          onComplete={({ lessonKey, xp }) => dispatch({ type: 'completeQuiz', lessonKey, xp })}
        />
      )}
    </div>
  );
}
```

Also update the header comment of `src/state/app.ts` to: `// App navigation + progress state. Pure reducer; App hydrates it from and saves it to a ProgressStore.`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/storage src/App.tsx src/App.test.tsx src/test/setup.ts src/state/app.ts
git commit -m "Persist completed units, practice sets and XP in localStorage" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Playwright smoke test (one lesson, one quiz, reload)

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json` (script + dev dependency), `vite.config.ts`, `tsconfig.json`, `README.md`

**Interfaces:**
- Consumes: the running app. Accessible names from earlier tasks: `Grid basics, 4 cards`, `Option D: …`, `Check`, `Continue`, `grid`/`center` bank chips, the `Feedback` region, `4 hearts left`, `Lesson complete!`, `25 XP`, `Grid basics, 4 cards, completed`; and `data-testid="demo-stage"` (existing, from Learn).
- Produces: `npm run test:e2e`.

- [ ] **Step 1: Install Playwright and configure**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Add to `package.json` `"scripts"`: `"test:e2e": "playwright test"`.

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 5180;

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
});
```

In `vite.config.ts`, add `include: ['src/**/*.test.{ts,tsx}'],` inside `test: { … }` so Vitest never picks up `e2e/`.

In `tsconfig.json`, change `"include"` to `["src", "e2e", "vite.config.ts", "playwright.config.ts"]`.

- [ ] **Step 2: Write the smoke test**

Create `e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('learn a unit, practice it, and keep the XP after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Grid basics, 4 cards' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Define columns');

  // The playground is real CSS: picking a value changes the rendered grid.
  await page.getByRole('button', { name: '100px 1fr' }).click();
  await expect(page.getByTestId('demo-stage')).toHaveCSS('grid-template-columns', /^100px /);

  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Practice this' }).click();

  const feedback = page.getByRole('region', { name: 'Feedback' });
  const check = page.getByRole('button', { name: 'Check' });
  const cont = page.getByRole('button', { name: 'Continue' });

  // predict-3: right first time (+10)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Which layout does this grid draw?');
  await page.getByRole('button', { name: /^Option D:/ }).click();
  await check.click();
  await expect(feedback).toContainText('Nice — that’s right!');
  await cont.click();

  // predict-4: wrong — costs a heart and comes back at the end
  await page.getByRole('button', { name: /^Option A:/ }).click();
  await check.click();
  await expect(feedback).toContainText('Answer: B');
  await expect(page.getByText('4 hearts left')).toBeAttached();
  await cont.click();

  // build-1: right first time (+10)
  await page.getByRole('button', { name: 'grid', exact: true }).click();
  await page.getByRole('button', { name: 'center', exact: true }).click();
  await check.click();
  await expect(feedback).toContainText('Nice');
  await cont.click();

  // predict-4 again: right after a miss (+5)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Item .a is orange. Which grid is this?');
  await page.getByRole('button', { name: /^Option B:/ }).click();
  await check.click();
  await cont.click();

  await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
  await expect(page.getByText('+25')).toBeVisible();
  await expect(page.getByText('67%')).toBeVisible();

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('25 XP')).toBeVisible();

  await page.reload();
  await expect(page.getByText('25 XP')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grid basics, 4 cards, completed' })).toBeVisible();
});
```

- [ ] **Step 3: Run it**

Run: `npm run test:e2e`
Expected: `1 passed`. If it fails, open the trace with `npx playwright show-report` and fix the app, not the assertion. Each assertion mirrors a behavior tested in Tasks 2–9.

- [ ] **Step 4: Document the commands**

Append to `README.md`:

```markdown

## Develop

- `npm run dev` — start the app (Vite).
- `npm test` — unit and component tests (Vitest).
- `npm run test:e2e` — browser smoke test (Playwright; first run `npx playwright install chromium`).
- `npm run build` — type-check and build to `dist/`.

Progress (completed units, practice sets, XP) is stored in `localStorage` under `cascade.progress.v1`.
```

- [ ] **Step 5: Run everything and commit**

Run: `npx vitest run && npm run build && npm run test:e2e`
Expected: all Vitest files PASS; the build succeeds; `1 passed`.

```bash
git add package.json package-lock.json playwright.config.ts e2e vite.config.ts tsconfig.json README.md
git commit -m "Add Playwright smoke test for a lesson and its quiz" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
