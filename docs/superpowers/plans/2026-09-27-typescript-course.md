# TypeScript Course Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Rust question engine into a language-parameterized code engine, then add a TypeScript course on it: 8 question types (including the new "Hover the type"), a `check:ts` content checker in CI, and 4 units.

**Architecture:** Rust and TS questions share generic shapes (`CodePredictQuestion<K>` …), renderers (`src/quiz/renderers/code/`), a grader and feedback copy, all dispatched by exhaustive switches with paired keys (`case 'rs-predict': case 'ts-predict':`). A language profile (`LANG` in `src/lib/codeLang.ts`) supplies what differs: highlighter, labels, error format. Keys stay course-prefixed, so stored progress and `question-types.json` files never change meaning. `check:ts` type-checks every TS snippet in one `tsc` run and executes the emitted JS on Node.

**Tech Stack:** Vite 8, React 19, TypeScript 7.0.2 (`tsc` CLI only; its JS API is `unstable/*`), CSS Modules, Vitest 5 + Testing Library, Playwright, Node 24 (`.nvmrc` 24.5.0; runs `scripts/*.ts` by type stripping), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-27-typescript-course-design.md`. Read it before starting; §-numbers below refer to it. The Rust spec (`2026-09-26-multi-course-rust-design.md` §5) defines the shared question shapes.

## Global Constraints

- Course id `ts`. TS type keys, in this order: `ts-predict`, `ts-pairs`, `ts-infer`, `ts-compiles`, `ts-build`, `ts-error`, `ts-fix`, `ts-type`. Rust keys and all Rust content are unchanged, except that `rs-choice` demos become `code-choice`.
- Every existing CSS and Rust unit test and e2e test keeps passing. Allowed edits: moved/renamed files and imports, and `rs-choice` → `code-choice`.
- Code arrays: a line starting with `# ` (or exactly `#`) is hidden. Displayed line numbers count visible lines only.
- Authored errors: Rust `^error\[E\d{4}\]: \S`, TS `^error TS\d+: \S` (e.g. `error TS2322: Type 'string' is not assignable to type 'number'.`).
- `thrown` strings are Node's `String(error)`, e.g. `TypeError: Cannot read properties of undefined (reading 'toUpperCase')`. `thrown` and `throws` are TS-only; Rust content using them is a validation error.
- Option texts are exact strings: Rust error option `Doesn’t compile`; TS error option `Type error`; TS throws option `Throws at runtime`. The curly apostrophe is U+2019.
- Labels are exact: code regions are `Rust code` / `TypeScript code`; feedback blocks are `rustc says` / `tsc says` / `Node says`; OutputPanel regions are `Output`, `Compiler error` and `Runtime error`, with titles `Doesn’t compile` / `Type error` / `Throws at runtime`.
- TS check settings: `strict: true`, `target: es2023`, `lib: ["es2023"]`, `types: []`, `module: nodenext`, `noEmitOnError: false`, `pretty: false`. `noUncheckedIndexedAccess` stays off. The only global is `console` (`log`, `error`).
- `typescript` is pinned exactly to `7.0.2` in `package.json`.
- Every snippet that type-checks is also run, including each `ts-infer` answer snippet, so TS content must never read a `declare`d or uninitialized value at runtime.
- Game rules are unchanged: 5 hearts, +10 XP first try, +5 after a miss, misses re-queue, pairs never cost hearts.
- Accessibility rules from CLAUDE.md apply to every new UI: real buttons, `aria-pressed`, `aria-live`, 44px targets, ≥ 4.5:1 contrast, never color alone.
- No new runtime dependencies.

## Review Focus

- **Invalid `ts-infer` distractor.** A typo'd type such as `strng` fails with TS2304, not TS2322. `check:ts` must report it as broken rather than accept it as "a wrong answer". Test: Task 5.
- **`ts-infer` name matched inside another word.** `x` inside `max` must not satisfy the "name appears on line" rule. Test: Task 6.
- **A program that prints, then throws.** Learn shows both the Output and the Runtime error blocks, in that order, and the checker compares both. Tests: Task 4, Task 5.
- **Rust content with TS-only fields.** `thrown` on a Rust demo, or a `throws` option in `rs-predict`, is rejected by validation. Tests: Task 4, Task 6.
- **Snippets leaking scope into each other.** Two snippets that both declare `const x` must not clash (TS2451) in the single `tsc` run, so every generated file is a module. Test: Task 7.

---

## File map

| Path | Responsibility |
|---|---|
| `src/lib/code.ts` (moved from `rustCode.ts`) | Language-neutral snippet helpers: hidden lines, blanks, slots, diffs, visible↔program lines. Import-free (Node runs it). |
| `src/lib/highlightTs.ts` | TS line tokenizer. |
| `src/lib/codeLang.ts` | `CodeLang`, `LANG` profile table, `langOfKey`, `courseLang`. |
| `src/content/types.ts` | Generic code-question shapes, `TsInferQuestion`, `CodeChoiceDemo`, `thrown`. |
| `src/content/guards.ts` | `isCodeQuestion`, `isCodeDemo`, `langOf`, `isPairs`, `isBuild`. |
| `src/content/validateCode.ts` (moved from `validateRust.ts`) | Validation for both code courses. |
| `src/quiz/renderers/code/` (moved from `rust/`) | `Code*` renderers, `CodeInfer`, `CodeQuestionBody`. |
| `src/quiz/grade/code.ts`, `src/quiz/feedback/code.ts` | Grader and feedback copy for both code courses. |
| `src/components/OutputPanel.tsx` | Output / compile error / runtime throw blocks. |
| `scripts/code-check-lib.ts` (moved from `rust-check-lib.ts`) | Pure logic: snippets, expectations, judging. |
| `scripts/tsc-lib.ts` | Pure TS adapter logic: generated files, tsc output parsing, harness. |
| `scripts/check-ts.ts` | `npm run check:ts` I/O. |
| `content/ts/` | The four content files. |

---

### Task 1: Language-neutral code helpers, TS highlighter, language profile

**Files:**
- Move: `src/lib/rustCode.ts` → `src/lib/code.ts`, `src/lib/rustCode.test.ts` → `src/lib/code.test.ts` (`git mv`)
- Modify: imports in `src/components/CodePanel.tsx`, `src/content/validateRust.ts`, `src/quiz/grade/rust.ts`, `src/quiz/session.ts`, `src/quiz/renderers/rust/*.tsx`, `scripts/check-rust.ts`, `scripts/rust-check-lib.ts` (scripts keep the `.ts` extension in the specifier)
- Create: `src/lib/highlightTs.ts`, `src/lib/highlightTs.test.ts`, `src/lib/codeLang.ts`, `src/lib/codeLang.test.ts`

**Interfaces:**
- Produces:
  - `src/lib/code.ts`: everything `rustCode.ts` exported, unchanged, plus:
    - `programLineOfVisible(code: readonly string[], visible: number): number | null`: the 1-based program line of visible line `visible`, or null when it's out of range.
    - `insertAfterVisibleLine(code: readonly string[], visible: number, line: string): string[] | null`
  - `highlightTs(line: string): { text: string; kind: TsTokenKind }[]`, with `TsTokenKind = 'keyword' | 'type' | 'string' | 'number' | 'comment' | 'punct' | 'plain'`.
  - `src/lib/codeLang.ts`:
    - `type CodeLang = 'rust' | 'ts'`
    - `interface LangProfile { name: string; codeLabel: string; compiler: string; errorTitle: string; errorPattern: RegExp; errorFormat: string; highlight(line: string): { text: string; kind: string }[] }`
    - `const LANG: Record<CodeLang, LangProfile>`
    - `langOfKey(type: string): CodeLang` (`ts-` prefix → `'ts'`, else `'rust'`)
    - `courseLang(id: CourseId): CodeLang | null` (`css` → null, `rust` → `'rust'`)

- [ ] **Step 1: Move the file and fix imports**

`git mv` both files, then update every import listed under Files. Run `npm run typecheck`. Expected: exit 0.

- [ ] **Step 2: Write failing tests**

```ts
// src/lib/code.test.ts (append)
describe('visible ↔ program lines', () => {
  const code = ['# fn main() {', 'let a = 1;', '#', 'let b = a;', '# }'];
  it('maps a visible line to its program line', () => {
    expect(programLineOfVisible(code, 1)).toBe(2);
    expect(programLineOfVisible(code, 2)).toBe(4);
    expect(programLineOfVisible(code, 3)).toBeNull();
    expect(programLineOfVisible(code, 0)).toBeNull();
  });
  it('inserts a line right after a visible line', () => {
    expect(insertAfterVisibleLine(code, 1, '# X')).toEqual(['# fn main() {', 'let a = 1;', '# X', '#', 'let b = a;', '# }']);
    expect(insertAfterVisibleLine(code, 9, '# X')).toBeNull();
  });
});

// src/lib/highlightTs.test.ts
it('colors keywords, primitives and numbers, merging adjacent tokens of one kind', () => {
  expect(highlightTs('const n: number = 5;')).toEqual([
    { text: 'const', kind: 'keyword' }, { text: ' n', kind: 'plain' }, { text: ':', kind: 'punct' },
    { text: ' ', kind: 'plain' }, { text: 'number', kind: 'type' }, { text: ' ', kind: 'plain' },
    { text: '=', kind: 'punct' }, { text: ' ', kind: 'plain' }, { text: '5', kind: 'number' }, { text: ';', kind: 'punct' },
  ]);
});
it('keeps strings, template literals and comments whole', () => {
  expect(highlightTs('const s = `hi ${name}`; // done').filter((t) => t.kind !== 'plain' && t.kind !== 'punct')).toEqual([
    { text: 'const', kind: 'keyword' }, { text: '`hi ${name}`', kind: 'string' }, { text: '// done', kind: 'comment' },
  ]);
  expect(highlightTs(`log('it\\'s', "a")`).filter((t) => t.kind === 'string').map((t) => t.text)).toEqual([`'it\\'s'`, '"a"']);
});
it('treats User and null as types, 0.5 as a number', () => {
  expect(highlightTs('let u: User | null = 0.5;').filter((t) => t.kind === 'type' || t.kind === 'number')).toEqual([
    { text: 'User', kind: 'type' }, { text: 'null', kind: 'type' }, { text: '0.5', kind: 'number' },
  ]);
});

// src/lib/codeLang.test.ts
it('profiles each language', () => {
  expect(LANG.rust).toMatchObject({ codeLabel: 'Rust code', compiler: 'rustc', errorTitle: 'Doesn’t compile' });
  expect(LANG.ts).toMatchObject({ codeLabel: 'TypeScript code', compiler: 'tsc', errorTitle: 'Type error' });
  expect(LANG.ts.errorPattern.test("error TS2322: Type 'string' is not assignable to type 'number'.")).toBe(true);
  expect(LANG.rust.errorPattern.test('error TS2322: x')).toBe(false);
  expect(langOfKey('ts-infer')).toBe('ts');
  expect(langOfKey('rs-fix')).toBe('rust');
  expect(courseLang('css')).toBeNull();
});
```


- [ ] **Step 3: Run them.** `npx vitest run src/lib`. Expected: FAIL (missing exports).

- [ ] **Step 4: Implement**

- `highlightTs` follows `highlightRust`'s rule-table structure, including merging adjacent tokens of the same kind. Rules, first match wins:
  - `//` comment
  - `"…"`, `'…'` and `` `…` `` strings, with escapes
  - numbers (`\d[\d_]*(\.\d+)?`)
  - identifiers
  - whitespace
  - single punctuation character
- The keyword and type sets are copied verbatim from spec §4 (`true`/`false` are keywords; `null`/`undefined` are types).
- `LANG.rust` has `errorFormat: 'error[E0000]: message'` and `highlight: highlightRust`. `LANG.ts` has `errorFormat: 'error TS0000: message'` and `highlight: highlightTs`.

- [ ] **Step 5: Run `npx vitest run src/lib && npm run typecheck`.** Expected: PASS.

- [ ] **Step 6: Commit**: `git commit -m "Move code helpers to lib/code, add the TS highlighter and language profiles"`

---

### Task 2: Generic code-question shapes, `code-choice`, code guards and validator

No behavior change. Only Rust is instantiated.

**Files:**
- Modify: `src/content/types.ts`, `src/content/guards.ts`, `src/content/validate.ts`, `src/lib/demo.ts` (`'rs-choice'` → `'code-choice'` in `initialSelection`), `scripts/rust-check-lib.ts` (demo kind string), `content/rust/lessons.json` (every `"kind": "rs-choice"` → `"code-choice"`), `src/lib/lib.test.ts`, `src/content/content.test.ts`
- Move: `src/content/validateRust.ts` → `validateCode.ts`, `validateRust.test.ts` → `validateCode.test.ts`

**Interfaces:**
- Consumes: `CodeLang`, `LANG`, `langOfKey`, `courseLang` (Task 1).
- Produces (`src/content/types.ts`):
  - `type CodeKey<K extends string> = \`rs-${K}\` | \`ts-${K}\``
  - `type PredictKind<K> = K extends 'ts-predict' ? 'output' | 'error' | 'throws' : 'output' | 'error'`
  - `CodePredictQuestion<K extends CodeKey<'predict'> = CodeKey<'predict'>>` with `{ type: K; code; opts: { text: string; kind: PredictKind<K> }[]; answer; error?; thrown? }`
  - `CodePairsQuestion<K>`, `CodeCompilesQuestion<K>`, `CodeBuildQuestion<K>`, `CodeErrorQuestion<K>`, `CodeFixQuestion<K>` and `CodeTypeQuestion<K>`, with the fields of today's Rust shapes. `RustXQuestion = CodeXQuestion<'rs-x'>` aliases replace today's interfaces.
  - `type CodeQuestion = RustQuestion` (Task 6 widens it). `type CodeQ<K extends string> = Extract<CodeQuestion, { type: CodeKey<K> }>`
  - `CodeChoiceOption` (was `RustChoiceOption`), `CodeChoiceDemo` (`kind: 'code-choice'`), `CodeCourseDemo = CodeDemo | CodeChoiceDemo` (was `RustDemo`). `Demo = CssDemo | CodeCourseDemo`.
- Produces (`src/content/guards.ts`): `isCodeDemo(d): d is CodeCourseDemo`, `isCodeQuestion(q): q is CodeQuestion` (`rs-` or `ts-` prefix), `langOf(q: CodeQuestion): CodeLang`. `isRustDemo` and `isRustQuestion` are removed, and callers switch to the new names.
- Produces (`src/content/validateCode.ts`): `validateCodeDemo(d: CodeCourseDemo, lang: CodeLang, at, err)`, `validateCodeQuestion(q: CodeQuestion, at, err)`, `isCodeError(v: unknown, lang: CodeLang): v is string`, `badError(lang): string` (`error must look like "${LANG[lang].errorFormat}"`).

- [ ] **Step 1: Rename in content and tests first**

- Update `content/rust/lessons.json` and the `rs-choice` literals in `src/lib/lib.test.ts` and `src/content/content.test.ts` to `code-choice`.
- `git mv` the validator files, and point the test's imports at `validateCode`. Its `check(d)` helper calls `validateCodeDemo(d, 'rust', …)` and `checkQ(q)` calls `validateCodeQuestion`.
- Run `npx vitest run src/content src/lib`. Expected: FAIL (`code-choice` is an unknown demo kind; imports are missing).

- [ ] **Step 2: Implement the types, guards and validator**

- `validateDemo` in `validate.ts` checks `isCodeDemo(d) !== (courseLang(courseId) !== null)`, then calls `validateCodeDemo(d, courseLang(courseId)!, …)`. The unmatched-backtick note check matches `'choice' | 'code-choice'`.
- `validateCodeQuestion` is today's switch with paired cases, using `isCodeError(v, langOf(q))`, `badError(langOf(q))`, and `LANG[langOf(q)].errorTitle` as the required error-option text.
- Every error message string stays byte-identical for Rust, so `validateCode.test.ts` passes unmodified apart from imports.
- Rename the renderers' and graders' imports of the removed guards; the files themselves move in Task 3.

- [ ] **Step 3: Verify.** `npm run typecheck && npx vitest run && npm run check:rust`. Expected: all PASS, and `check:rust` reports 0 failed.

- [ ] **Step 4: Commit**: `git commit -m "Generalize Rust question shapes into code-question shapes and rename rs-choice to code-choice"`

---

### Task 3: Move Rust renderers, grader and feedback into the code family

No behavior change.

**Files:**
- Move (`git mv`, then rename symbols): `src/quiz/renderers/rust/Rust{Predict,Pairs,Compiles,Build,Error,Fix,Type}.{tsx,module.css,test.tsx}` → `src/quiz/renderers/code/Code*`. Also `RustQuestionBody.tsx` → `code/CodeQuestionBody.tsx` and `choice.module.css` → `code/choice.module.css`.
- Move: `src/quiz/grade/rust.ts` → `grade/code.ts`, `grade/rust.test.ts` → `grade/code.test.ts`, `src/quiz/feedback/rust.ts` → `feedback/code.ts`, `feedback/rust.test.ts` → `feedback/code.test.ts`
- Modify: `src/quiz/renderers/QuestionBody.tsx`, `src/quiz/grade/index.ts`, `src/quiz/feedback/index.ts`, `src/components/CodePanel.tsx`, `src/quiz/renderers/LinePicker.tsx`

**Interfaces:**
- Consumes: `CodeQ<K>`, `isCodeQuestion`, `langOf` (Task 2); `LANG` (Task 1).
- Produces:
  - Components `CodePredict`, `CodePairs`, `CodeCompiles`, `CodeBuild`, `CodeError`, `CodeFix` and `CodeType`, each typed `RendererProps<CodeQ<'predict'>>` etc.
  - `CodeQuestionBody({ question, answer, act }: RendererProps<CodeQuestion>): ReactElement`, with paired cases and no `default`.
  - `canCheckCode(q: CodeQuestion, a)`, `isCorrectCode(q: CodeQuestion, a)`, `codeFeedback(q: CodeQuestion, a, praise): FeedbackText`.
  - `CodePanel`: `lang?: PanelLang` with `type PanelLang = 'css' | CodeLang` (exported; replaces the exported `CodeLang` there). Any non-CSS lang hides `# ` lines and numbers lines, and tokens come from `LANG[lang].highlight`. `LinePicker`'s `lang` prop becomes `PanelLang`.

- [ ] **Step 1: Move files, rename symbols, fix imports.** Each renderer reads `const lang = langOf(q)` and passes `lang={lang}` and `label={LANG[lang].codeLabel}` wherever it hard-coded `"rust"` / `"Rust code"`. `RustBuild`'s group label becomes `LANG[lang].codeLabel`.

- [ ] **Step 2: Verify.** `npm run typecheck && npx vitest run`. Expected: PASS with the moved tests unchanged apart from imports and `describe` names. Also run `grep -rn "renderers/rust\|grade/rust\|feedback/rust\|RustQuestionBody" src` and expect no output.

- [ ] **Step 3: Commit**: `git commit -m "Move Rust renderers, grading and feedback into a shared code family"`

---

### Task 4: Runtime throws in demos and OutputPanel, TS-aware panels, TsIcon

**Files:**
- Modify: `src/content/types.ts` (`thrown?: string` on `CodeDemo` and `CodeChoiceOption`), `src/content/validateCode.ts`, `src/lib/demo.ts`, `src/components/OutputPanel.tsx` (+ `.module.css` if needed), `src/screens/Learn.tsx`, `src/components/icons.tsx`
- Test: `src/components/OutputPanel.test.tsx`, `src/components/CodePanel.test.tsx`, `src/content/validateCode.test.ts`, `src/lib/lib.test.ts`, `src/components/icons.test.tsx` (the existing Rust tests in `src/screens/Learn.test.tsx` must keep passing)

**Interfaces:**
- Produces:
  - `CodeDemoView = { code; output?; error?; thrown?; controls; caption }` and `buildCodeDemo(demo: CodeCourseDemo, selection): CodeDemoView`. These replace `RustDemoView` and `buildRustDemo`.
  - `OutputPanel({ lang = 'rust', output, error, thrown }: { lang?: CodeLang; output?: readonly string[]; error?: string; thrown?: string })`
  - `CodePlayground({ lang, view, onPick })` in Learn.
  - `TsIcon` exported from `icons.tsx` (not yet in `CourseIcon`; see Task 8).

- [ ] **Step 1: Write failing tests**

```tsx
// OutputPanel.test.tsx
it('titles a TS compile error "Type error"', () => {
  render(<OutputPanel lang="ts" error="error TS2322: Type 'string' is not assignable to type 'number'." />);
  expect(screen.getByRole('region', { name: 'Compiler error' })).toHaveTextContent('Type error');
});
it('shows output, then the runtime throw, with an icon and words', () => {
  render(<OutputPanel lang="ts" output={['start']} thrown="TypeError: x is not a function" />);
  const regions = screen.getAllByRole('region');
  expect(regions.map((r) => r.getAttribute('aria-label'))).toEqual(['Output', 'Runtime error']);
  expect(regions[1]).toHaveTextContent('Throws at runtime');
  expect(regions[1]).toHaveTextContent('TypeError: x is not a function');
  expect(regions[1]!.querySelector('svg')).not.toBeNull();
});

// CodePanel.test.tsx
it('numbers TS lines and hides # lines', () => {
  render(<CodePanel lines={['# const a = 1;', 'console.log(a);']} lang="ts" label="TypeScript code" />);
  const panel = screen.getByLabelText('TypeScript code');
  expect(panel).toHaveTextContent(/^1console\.log\(a\);$/);
  expect(panel).toHaveClass('numbered');
});

// validateCode.test.ts
it('accepts thrown (with or without output) on TS demos and rejects it on Rust demos', () => {
  const errs = (d: unknown, lang: CodeLang) => { const out: string[] = []; validateCodeDemo(d as CodeCourseDemo, lang, 'd', (w, m) => out.push(`${w}: ${m}`)); return out; };
  expect(errs({ kind: 'code', code: ['x;'], output: ['a'], thrown: 'TypeError: t' }, 'ts')).toEqual([]);
  expect(errs({ kind: 'code', code: ['x;'], thrown: 'TypeError: t' }, 'rust')).toEqual(['d: thrown is only for TypeScript']); // Review Focus
  expect(errs({ kind: 'code', code: ['x;'], error: 'error TS2322: x', thrown: 'TypeError: t' }, 'ts')).toEqual(['d: code demo has both thrown and error']);
  expect(errs({ kind: 'code', code: ['x;'], thrown: '' }, 'ts')).toEqual(['d: thrown must be a non-empty string']);
});
it('needs error, or output and/or thrown, on each TS code-choice option', () => {
  const demo = { kind: 'code-choice', label: 'L', opts: [{ label: 'a', code: ['x;'] }, { label: 'b', code: ['y;'], thrown: 'TypeError: t' }] };
  expect(errs(demo, 'ts')).toEqual(['d/option a: needs error, or output and/or thrown']);
});

// lib.test.ts
it('carries thrown through buildCodeDemo', () => {
  expect(buildCodeDemo({ kind: 'code', code: ['x;'], output: ['a'], thrown: 'TypeError: t' }, [])).toMatchObject({ output: ['a'], thrown: 'TypeError: t' });
});
// icons.test.tsx: follow the existing icon test's pattern for TsIcon (renders an svg, aria-hidden).
```

Every existing Rust message stays byte-identical: `code demo has both output and error`, and `needs exactly one of output and error` for a Rust option. The new messages above apply only to the new cases. The TS Learn-screen test lands in Task 8, once `ts` is a course id.

- [ ] **Step 2: Run them.** `npx vitest run src/components src/content src/lib src/screens`. Expected: FAIL.

- [ ] **Step 3: Implement**

- **OutputPanel.** `error` renders the existing "Compiler error" section, titled `LANG[lang].errorTitle`. Otherwise it renders an Output section when `output !== undefined`, then (if `thrown`) a section with `aria-label="Runtime error"`: `XCircleIcon`, the title `Throws at runtime`, and a `<pre>` holding `thrown`.
- **Learn.** Replace `RustPlayground` with `CodePlayground`, which gets `lang = courseLang(course.id)!` (render it for any `isCodeDemo` card) and uses `LANG[lang].codeLabel`. Show the result block when any of output, error or thrown is present, inside the existing `aria-live` wrapper.
- **TsIcon.** A rounded square with "TS" as `<text>`, following `CssIcon`'s drawing conventions.

- [ ] **Step 4: Verify.** `npm run typecheck && npx vitest run`. Expected: PASS.

- [ ] **Step 5: Commit**: `git commit -m "Show runtime throws in code demos and label panels per language"`

---

### Task 5: Shared checker lib with runtime throws and program-line errors

**Files:**
- Move: `scripts/rust-check-lib.ts` → `scripts/code-check-lib.ts`, `rust-check-lib.test.ts` → `code-check-lib.test.ts`
- Modify: `scripts/check-rust.ts` (import path; pass `'rustc'` to `judge`)

**Interfaces:**
- Consumes: `CodeDemo.thrown` (Task 4); `programLineOfVisible` (Task 1).
- Produces:
  - `Expect` gains `{ kind: 'throws'; thrown: string; output?: string[] }`, and its error variant gains `programLine?: number`: the exact 1-based program line, used for inserted assertions.
  - `CompileResult`'s ok variant gains `thrown?: string`.
  - `errorCode(message)` returns `E0382` for `error[E0382]: …` and `TS2322` for `error TS2322: …`.
  - `judge(s: Snippet, r: CompileResult, compiler = 'rustc'): string | null`
  - `collectSnippets` maps a demo or option with `thrown` to the `throws` expectation.

- [ ] **Step 1: Move files.** Run `npx vitest run scripts && npm run check:rust`. Expected: PASS (pure rename).

- [ ] **Step 2: Write failing tests** (append to `code-check-lib.test.ts`)

```ts
it('reads TS error codes', () => {
  expect(errorCode("error TS2322: Type 'string' is not assignable to type 'number'.")).toBe('TS2322');
});
it('judges runtime throws', () => {
  const s = snippet({ kind: 'throws', thrown: 'TypeError: boom', output: ['a'] });
  expect(judge(s, { ok: true, stdout: 'a\n', thrown: 'TypeError: boom' }, 'tsc')).toBeNull();
  expect(judge(s, { ok: true, stdout: 'a\n' }, 'tsc')).toBe('expected it to throw, but it ran to completion');
  expect(judge(s, { ok: true, stdout: 'a\n', thrown: 'RangeError: x' }, 'tsc')).toBe('expected it to throw "TypeError: boom", got "RangeError: x"');
  expect(judge(s, { ok: true, stdout: 'b\n', thrown: 'TypeError: boom' }, 'tsc')).toBe('expected output "a", got "b"');
  expect(judge(s, { ok: false, errorCode: 'TS2322', line: 2 }, 'tsc')).toBe('expected it to type-check and throw, tsc reported TS2322');
});
it('fails an unexpected throw', () => {
  expect(judge(snippet({ kind: 'output', output: ['a'] }), { ok: true, stdout: 'a\n', thrown: 'TypeError: t' }, 'tsc')).toBe('program threw: TypeError: t');
});
it('checks errors on an exact program line (inserted assertions), and rejects a different code there', () => {
  const e = snippet({ kind: 'error', code: 'TS2322', programLine: 3 });
  expect(judge(e, { ok: false, errorCode: 'TS2322', line: 3 }, 'tsc')).toBeNull();
  expect(judge(e, { ok: false, errorCode: 'TS2322', line: 2 }, 'tsc')).toBe('expected the error on program line 3, tsc points at program line 2');
  expect(judge(e, { ok: false, errorCode: 'TS2304', line: 3 }, 'tsc')).toBe('expected TS2322, tsc reported TS2304'); // Review Focus: invalid distractor
});
it('collects a thrown demo', () => {
  const units = [{ key: 'u', name: 'U', blurb: 'B', cards: [{ title: 'T', body: 'B', demo: { kind: 'code', code: ['x;'], output: ['a'], thrown: 'TypeError: t' } }] }] as Unit[];
  expect(collectSnippets(units, []).snippets[0]!.expect).toEqual({ kind: 'throws', thrown: 'TypeError: t', output: ['a'] });
});
```

The existing Rust-message tests keep passing because `compiler` defaults to `'rustc'`.

- [ ] **Step 3: Run them.** `npx vitest run scripts`. Expected: FAIL.

- [ ] **Step 4: Implement.** The `throws` branch is described by the tests above. Error-kind checks run in this order: compiled, code, visible `line`, `programLine`.

- [ ] **Step 5: Verify.** `npx vitest run scripts && npm run typecheck && npm run check:rust`. Expected: PASS, 0 failed.

- [ ] **Step 6: Commit**: `git commit -m "Share the content checker lib across code courses and judge runtime throws"`

---

### Task 6: TypeScript question types (shapes, validation, grading, feedback, renderers, snippet collection)

These land together because every exhaustive switch must cover the new keys in the same commit.

**Files:**
- Modify: `src/content/typeKeys.ts`, `src/content/types.ts`, `src/content/guards.ts`, `src/content/validateCode.ts`, `src/quiz/grade/code.ts`, `src/quiz/feedback/code.ts`, `src/quiz/feedback/shared.ts`, `src/quiz/FeedbackSheet.tsx` (+ css), `src/quiz/renderers/code/CodeQuestionBody.tsx`, `src/quiz/renderers/code/CodePredict.tsx`, `scripts/code-check-lib.ts`
- Create: `src/quiz/tsFixtures.ts`, `src/quiz/renderers/code/CodeInfer.tsx`, `CodeInfer.module.css`, `CodeInfer.test.tsx`
- Test: `src/content/validateCode.test.ts`, `src/quiz/grade/code.test.ts`, `src/quiz/feedback/code.test.ts`, `src/quiz/FeedbackSheet.test.tsx`, `src/quiz/renderers/code/CodePredict.test.tsx`, `scripts/code-check-lib.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `TS_TYPE_KEYS` (Global Constraints order), `TsTypeKey`, `QuestionTypeKey = CssTypeKey | RustTypeKey | TsTypeKey`. `TYPE_KEYS` is unchanged until Task 8.
  - `TsInferQuestion { type: 'ts-infer'; code: string[]; line: number; name: string; opts: string[]; answer: number }` (+ base fields).
  - `TsQuestion` = the seven `CodeXQuestion<'ts-x'>` plus `TsInferQuestion`. `CodeQuestion = RustQuestion | TsQuestion`, and `Question = CssQuestion | CodeQuestion`.
  - `isPairs` and `isBuild` accept the `ts-` keys.
  - `FeedbackText.runtime?: string`.
  - `CodeInfer: RendererProps<TsInferQuestion>`
  - `inferAssertion(i: number, name: string, type: string): string` in `code-check-lib.ts`, returning `# const __ok${i}: __Eq<typeof ${name}, ${type}> = true;`
  - `src/quiz/tsFixtures.ts`: `tsPredict` (answer is `output`), `tsPredictThrows`, `tsPredictError`, `tsInfer` and `tsCompiles`, typed as their TS shapes. `tsInfer` (id `ts-infer-1`) is exactly:
    ```ts
    code: ['function show(x: string | number) {', '  if (typeof x === "string") {', '    console.log(x.length);', '  }', '}'],
    line: 3, name: 'x', opts: ['string', 'string | number', 'number', 'never'], answer: 0,
    ```
    It only defines a function, so its snippets run without throwing.

    The three predict fixtures share `opts: [{ text: '5', kind: 'output' }, { text: '"5"', kind: 'output' }, { text: 'Type error', kind: 'error' }, { text: 'Throws at runtime', kind: 'throws' }]` but each has its own real program, because Task 7 runs them through `check:ts`:
    - `tsPredict`: answer 0, `code: ['const n = 2 + 3;', 'console.log(n);']`
    - `tsPredictError`: answer 2, `code: ['const n: number = "5";', 'console.log(n);']`, `error: "error TS2322: Type 'string' is not assignable to type 'number'."`
    - `tsPredictThrows`: answer 3, `code: ['const words: string[] = [];', 'console.log(words[0].toUpperCase());']`, `thrown: "TypeError: Cannot read properties of undefined (reading 'toUpperCase')"`

    `tsCompiles` is a Type-checks? pair: `a` assigns a string to a `number` (fails with the TS2322 error), and `b` assigns a number; answer `'b'`.

- [ ] **Step 1: Write failing tests**

```ts
// validateCode.test.ts
it('validates ts-predict outcomes', () => {
  expect(checkQ({ ...tsPredictThrows, thrown: undefined })).toContain('q: thrown is required exactly when the answer is the throws option');
  expect(checkQ({ ...tsPredict, opts: [...tsPredict.opts.slice(0, 2), { text: 'Throws', kind: 'throws' }] })).toContain('q: the throws option must read "Throws at runtime"');
  expect(checkQ({ ...tsPredictError, opts: [...tsPredictError.opts.slice(0, 3), { text: 'Type error', kind: 'error' }] })).toContain('q: at most one error option and one throws option');
  expect(checkQ({ ...rsPredict, opts: [...rsPredict.opts.slice(0, 2), { text: 'Throws at runtime', kind: 'throws' }] })).toContain('q: opt 2 needs text and kind "output" or "error"'); // Review Focus
});
it('validates ts-infer', () => {
  expect(checkQ(tsInfer)).toEqual([]);
  expect(checkQ({ ...tsInfer, name: 'y' })).toContain('q: name "y" does not appear on line 3');
  expect(checkQ({ ...tsInfer, code: tsInfer.code.map((l, i) => (i === 2 ? l.replace('x.', 'max.') : l)) })).toContain('q: name "x" does not appear on line 3'); // Review Focus: whole word
  expect(checkQ({ ...tsInfer, line: 99 })).toContain('q: line must be a visible line number');
  expect(checkQ({ ...tsInfer, opts: ['string', 'string', 'number'] })).toContain('q: opts must be unique and non-empty');
});

// grade/code.test.ts
it('grades ts-infer and ts-predict by the picked option', () => {
  for (const q of [tsInfer, tsPredictThrows]) {
    expect(canCheck(q, answer(q))).toBe(false);
    expect(isCorrect(q, answer(q, { sel: q.answer }))).toBe(true);
    expect(isCorrect(q, answer(q, { sel: (q.answer + 1) % q.opts.length }))).toBe(false);
  }
});
// feedback/code.test.ts
it('gives Node’s message for a throws answer and tsc’s for an error answer', () => {
  expect(feedbackText(tsPredictThrows, { ...freshAnswer(tsPredictThrows), checked: true, ok: false, sel: 0 }, 0)).toMatchObject({ detail: 'Answer: D', runtime: tsPredictThrows.thrown });
  expect(feedbackText(tsPredictError, { ...freshAnswer(tsPredictError), checked: true, ok: true, sel: tsPredictError.answer }, 0).compiler).toBe(tsPredictError.error);
  expect(feedbackText(tsInfer, { ...freshAnswer(tsInfer), checked: true, ok: false, sel: 1 }, 0)).toEqual({ title: 'Not quite', detail: 'Answer: A' });
});

// FeedbackSheet.test.tsx: tsCompiles shows "tsc says"; tsPredictThrows shows "Node says" + thrown; rsError still shows "rustc says".
// CodePredict.test.tsx (component-level render, since TS isn't a bundled course yet):
//   TS options render "Type error" and "Throws at runtime" as text; the code region is labelled "TypeScript code".

// CodeInfer.test.tsx
it('marks the hovered name with more than color and offers types as pressed tiles', async () => {
  const act = vi.fn();
  render(<CodeInfer question={tsInfer} answer={freshAnswer(tsInfer)} act={act} />);
  expect(screen.getByLabelText('TypeScript code, x on line 3')).toBeInTheDocument();
  expect(screen.getByText('hover')).toBeInTheDocument();
  const tile = screen.getByRole('button', { name: 'Option A: x: string' });
  expect(tile).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(tile);
  expect(act).toHaveBeenCalledWith({ type: 'select', sel: 0 });
});
it('announces tones after Check', () => {
  render(<CodeInfer question={tsInfer} answer={{ ...freshAnswer(tsInfer), sel: 1, checked: true }} act={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Option B: x: string | number, your answer, incorrect' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Option A: x: string, correct answer' })).toBeInTheDocument();
});

// code-check-lib.test.ts
it('collects ts-infer as one snippet per option with the assertion after the line', () => {
  const { snippets } = collectSnippets([], [tsInfer]);
  expect(snippets.map((s) => s.expect)).toEqual([
    { kind: 'compiles' },
    { kind: 'error', code: 'TS2322', programLine: 4 },
    { kind: 'error', code: 'TS2322', programLine: 4 },
    { kind: 'error', code: 'TS2322', programLine: 4 },
  ]);
  expect(snippets[1]!.code[3]).toBe('# const __ok1: __Eq<typeof x, string | number> = true;');
});
it('collects ts-predict throws and error answers', () => {
  const { snippets } = collectSnippets([], [tsPredictThrows, tsPredictError]);
  expect(snippets.map((s) => s.expect)).toEqual([
    { kind: 'throws', thrown: tsPredictThrows.thrown },
    { kind: 'error', code: errorCode(tsPredictError.error!) },
  ]);
});
```

With the fixture above there are no hidden lines, so visible line 3 is program line 3 and the assertion lands at program line 4 (`code[3]`).

- [ ] **Step 2: Run them.** `npx vitest run`. Expected: FAIL.

- [ ] **Step 3: Implement**

- **Validation (spec §3).** `ts-predict` options are `output | error | throws`, with exact texts from Global Constraints. There is at most one `error` and one `throws` option. `error` is required exactly when the answer is the error option, and `thrown` exactly when it's the throws option. `thrown` is a non-empty string.
- **Rust predict.** A `throws` kind or a `thrown` field is rejected, keeping today's `opt N needs text and kind "output" or "error"` message.
- **`ts-infer` validation.** `name` matches `^[A-Za-z_$][\w$]*$` and appears on the visible `line` as `\bname\b`. Options are 3–4 unique non-empty strings, and `answer` is in range.
- **CodeInfer.** The code panel is `aria-label={\`${LANG.ts.codeLabel}, ${name} on line ${line}\`}`. On `line`, the first whole-word `name` is wrapped in a `<mark>` with a dotted underline, followed by a small visible `hover` tag. Tiles follow `CodePredict`'s structure (letter, tone, `ToneMark`) with the label `Option X: name: type`.
- **CodePanel.** It gains an optional `mark?: { line: number; name: string }` prop to support that wrapping; `CodeInfer` passes it.
- **CodePredict.** Option spans use the error style for both `error` and `throws`.
- **FeedbackSheet.** The compiler caption is `` `${LANG[langOf(question)].compiler} says` ``. When `runtime` is set, add a second figure with the caption `Node says`, in the same style.
- **`collectSnippets`.**
  - `ts-infer`: for each option `i`, `insertAfterVisibleLine(q.code, q.line, inferAssertion(i, q.name, opt))`. Expect `compiles` for the answer and `{ kind: 'error', code: 'TS2322', programLine }` for the rest, where `programLine = programLineOfVisible(q.code, q.line)! + 1`.
  - `ts-predict`'s `throws` answer maps to `{ kind: 'throws', thrown: q.thrown }`.
  - Every other `ts-*` case is paired with its `rs-*` case.

- [ ] **Step 4: Verify.** `npm run typecheck && npx vitest run && npm run check:rust`. Expected: PASS, 0 failed.

- [ ] **Step 5: Commit**: `git commit -m "Add TypeScript question types, including Hover the type and runtime throws"`

---

### Task 7: `npm run check:ts`

**Files:**
- Create: `scripts/tsc-lib.ts`, `scripts/tsc-lib.test.ts`, `scripts/check-ts.ts`
- Modify: `package.json` (`"check:ts": "node scripts/check-ts.ts"`; `"typescript": "7.0.2"`), `package-lock.json` (via `npm install --save-exact typescript@7.0.2`)

**Interfaces:**
- Consumes: `collectSnippets`, `judge`, `CompileResult` (Tasks 5, 6); `programSource` (Task 1).
- Produces (`scripts/tsc-lib.ts`, pure):
  - `TS_GLOBALS: string` and `EQ_TYPE: string` (the file contents, verbatim from spec §5)
  - `TSCONFIG: object` (Global Constraints settings, plus `outDir: "out"`, `skipLibCheck: true`, `include: ["*.mts", "*.d.ts"]`)
  - `HARNESS: string`
  - `tsModuleSource(code: readonly string[]): string` = `programSource(code) + 'export {};\n'`
  - `snippetFile(n: number): string` → `s${n}.mts`
  - `parseTscOutput(stdout: string): Map<number, { errorCode: string; line: number }>`: the first error per snippet index.
  - `parseThrown(stderr: string): string | null`

- [ ] **Step 1: Write failing tests**

```ts
it('makes every snippet a module so snippets never share scope', () => {
  expect(tsModuleSource(['# const x = 1;', 'console.log(x);'])).toBe('const x = 1;\nconsole.log(x);\nexport {};\n'); // Review Focus
});
it('keeps the first error per snippet', () => {
  const out = [
    "s0.mts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.",
    "s0.mts(2,1): error TS2304: Cannot find name 'y'.",
    's12.mts(4,11): error TS2322: Type \'true\' is not assignable to type \'false\'.',
    'globals.d.ts(1,1): error TS1234: ignored',
  ].join('\n');
  expect(parseTscOutput(out)).toEqual(new Map([[0, { errorCode: 'TS2322', line: 1 }], [12, { errorCode: 'TS2322', line: 4 }]]));
});
it('reads the harness THROWN line', () => {
  expect(parseThrown("warning\nTHROWN TypeError: Cannot read properties of undefined (reading 'toUpperCase')\n")).toBe("TypeError: Cannot read properties of undefined (reading 'toUpperCase')");
  expect(parseThrown('')).toBeNull();
});
```

- [ ] **Step 2: Run them.** `npx vitest run scripts/tsc-lib.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement `tsc-lib.ts`, then `check-ts.ts`**

- **Inputs.** Read `content/ts` (or `argv[2]`) `lessons.json` and `questions.json`, and collect snippets.
- **Workspace.** In a `mkdtemp` dir, write `sN.mts`, `globals.d.ts`, `eq.d.ts`, `tsconfig.json` and `harness.mjs`.
- **Type-check.** Run `node_modules/.bin/tsc -p <dir>` once (resolved from the repo root, 120 s timeout). The exit code is non-zero whenever any snippet errors, so read diagnostics from stdout instead.
- **Run.** Each snippet with no error runs as `node harness.mjs out/sN.mjs` with a 5 s timeout. Exit 3 means thrown, via `parseThrown`. Any other non-zero exit, signal or timeout becomes `runError`, as in `check-rust.ts`.
- **Report.** Print `tsc --version` first. Judge with `judge(s, r, 'tsc')`, print `✗ where: why` per failure, print `N snippets checked, M failed`, and set the exit code as in `check-rust.ts`.

- [ ] **Step 4: Verify against fixtures**

- Write `tsPredict`, `tsPredictThrows`, `tsPredictError`, `tsInfer` and `tsCompiles` as `questions.json` (plus an empty `lessons.json`) into a scratch dir, then run `npm run check:ts -- <dir>`. Expected: `… snippets checked, 0 failed`.
- Change one `tsInfer` distractor to `strng` and rerun. Expected: exit 1 and a line `✗ ts-infer-…: expected TS2322, tsc reported TS2304`.
- Then `npx vitest run scripts && npm run typecheck`. Expected: PASS.

- [ ] **Step 5: Commit**: `git commit -m "Add check:ts, which type-checks and runs TypeScript content, and pin typescript"`

---

### Task 8: Wire up the TypeScript course with unit 1 (Values & equality), CI job and e2e

**Files:**
- Create: `content/ts/lessons.json`, `questions.json`, `question-types.json`, `topics.json`, `e2e/ts.spec.ts`
- Modify: `src/content/typeKeys.ts` (`COURSE_IDS`, `COURSE_ICON_NAMES`, `TYPE_KEYS.ts`), `src/lib/codeLang.ts` (`courseLang('ts') → 'ts'`), `src/components/icons.tsx` (`CourseIcon` case `'ts'`), `content/courses.json`, `src/content/index.ts` (bundle), `src/content/content.test.ts`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: course `ts` in `courses` / `courseById('ts')`, and the `ts-content` CI job. The job lands here rather than with `check:ts` (spec §9 step 4) so that CI never runs the checker against a missing `content/ts/`.

- [ ] **Step 1: Write failing content tests** (`content.test.ts`)

```ts
describe('ts content', () => {
  const ts = courseById('ts');
  it('is valid', () => expect(validateContent(ts)).toEqual([]));
  it('has Values & equality with 6 cards and an 8-question quiz in type order', () => {
    expect(ts.units.map((u) => u.key)).toEqual(['values']);
    expect(ts.units[0]!.cards).toHaveLength(6);
    const quiz = ts.topics.values!.map((id) => ts.questions.find((q) => q.id === id)!.type);
    expect(quiz).toEqual([...TS_TYPE_KEYS]);
  });
});
```

Also update the `validateCourses` expectations that list bundled ids. In `src/screens/Learn.test.tsx`, add a TS harness (a `Course` with `id: 'ts'`) whose `code-choice` demo is labelled "TypeScript code" and whose second option swaps the `Output` region for `Output` + `Runtime error` regions (Review Focus).

- [ ] **Step 2: Run them.** `npx vitest run src/content`. Expected: FAIL.

- [ ] **Step 3: Wire the course and author unit 1**

- **`courses.json`.** Add the entry verbatim from spec §4, third in order.
- **`question-types.json`.** Names and blurbs, in `TS_TYPE_KEYS` order:
  - Predict the output / Read TypeScript, pick what happens
  - Match pairs / Code ↔ what it means
  - Hover the type / Pick the type the editor shows
  - Type-checks? / Pick the snippet tsc accepts
  - Word bank / Fill the blanks, see the output
  - Spot the type error / Find the line tsc rejects
  - Fix it / Pick the change that type-checks
  - Type the token / Recall it from memory
- **Cards.** Follow spec §6 unit 1 (titles, demo kinds, `values` key, *Predict what basic values do.* as the unit blurb).
- **Questions.** Ids are `ts-<kind>-1`, one per type. The `ts-infer` question tests inference (e.g. `let` vs `const` of a number). At least one question or demo uses an `error` outcome (card 4's TS2367).
- **Content rules.**
  - Every `ts-type`/`ts-build` answer is a token the unit's cards show.
  - Outputs are exactly what Node prints.
  - Explanations are 1–2 sentences.
- **Run `npm run check:ts` until it passes.** Fix content, never the checker, unless the checker is demonstrably wrong.

- [ ] **Step 4: Add the CI job** (`.github/workflows/ci.yml`)

```yaml
  ts-content:
    name: TypeScript content type-checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run check:ts
```

- [ ] **Step 5: Write `e2e/ts.spec.ts`**

Model it on `e2e/rust.spec.ts`:
1. First launch → `TypeScript,` course button → the tagline `TypeScript, one tap at a time` is visible.
2. Open "Values & equality, 6 cards". On card 4, tap the other `code-choice` option and expect the result region to change.
3. Finish the cards, then "Practice this". Answer all 8 questions, getting exactly the `ts-compiles` question wrong first. Expect "tsc says" in feedback and "4 hearts left".
4. Answer it right when it comes back.
5. Expect `+75`, `88%`, and `75 XP` on Home.

- [ ] **Step 6: Verify.** `npm run typecheck && npx vitest run && npm run check:ts && npm run check:rust && npm run build && npm run test:e2e`. Expected: all PASS.

- [ ] **Step 7: Commit**: `git commit -m "Add the TypeScript course with Values & equality, its content CI job and an e2e test"`

---

### Task 9: Unit 2, Objects & arrays

**Files:** `content/ts/lessons.json`, `questions.json`, `topics.json`, `src/content/content.test.ts`

- [ ] **Step 1: Extend the content test.** Unit keys are `['values', 'objects']`, `objects` has 6 cards, and its quiz is in `TS_TYPE_KEYS` order. Run it. Expected: FAIL.
- [ ] **Step 2: Author the unit** per spec §6 unit 2 (blurb *Model data with object types, and predict aliasing.*).
  - Ids end in `-2`.
  - Card 5's demo shows `words[5].toUpperCase()` with `thrown`.
  - At least one question has a `throws` answer (e.g. an `as` cast that lies about a shape).
  - `ts-infer` tests an object type.
- [ ] **Step 3: Verify.** `npx vitest run src/content && npm run check:ts`. Expected: PASS, 0 failed.
- [ ] **Step 4: Commit**: `git commit -m "Add TypeScript unit 2: Objects & arrays"`

---

### Task 10: Unit 3, Functions

Same steps as Task 9, per spec §6 unit 3:
- key `functions`, 5 cards, ids ending in `-3`
- blurb *Write typed functions and predict closures.*
- `ts-infer` tests an inferred return type

Commit: `git commit -m "Add TypeScript unit 3: Functions"`.

---

### Task 11: Unit 4, Unions & narrowing

Same steps as Task 9, per spec §6 unit 4:
- key `narrowing`, 6 cards, ids ending in `-4`
- blurb *Model "one of these" and let the compiler prove which.*
- `ts-infer` tests a narrowed type inside a `typeof` or discriminant check
- card 6's demo shows the exhaustiveness error

Also assert the totals in `content.test.ts`: 23 cards and 32 questions. Commit: `git commit -m "Add TypeScript unit 4: Unions & narrowing"`.

---

### Task 12: Docs

**Files:** `CLAUDE.md`, `docs/content-schema.md`, `docs/design-rationale.md`, `README.md` (if it lists courses)

- [ ] **Step 1: `CLAUDE.md`**
  - "What exists" table: add `content/ts/`, `scripts/check-ts.ts`, and the code-family paths.
  - "Adding a course": for a code course, the list is a highlighter + `LANG` entry + `courseLang` case, paired keys in the code-family switches, and a checker adapter.
  - Add a "TypeScript course" section with these rules: strict `tsc` 7.0.2 via `npm run check:ts`; `console` is the only global; errors are tsc's first line (`error TS2322: …`); `thrown` is Node's `String(error)`; the `ts-infer` whole-word rule and no reassignment on its line; hidden `# ` lines as in Rust; the typed-token rules as in Rust.
  - Update the Rust section's `rs-choice` mention.
- [ ] **Step 2: `docs/content-schema.md`.** Add the TS course, the `ts-predict` kinds and `thrown`, `ts-infer`, `code-choice`, and demo `thrown`.
- [ ] **Step 3: `docs/design-rationale.md`.** Explain why `ts-infer` and runtime throws exist for programmers new to JS (types are erased; the editor's hover is the core feedback loop).
- [ ] **Step 4: Verify.** `npm run typecheck && npx vitest run`. Expected: PASS (docs-only sanity).
- [ ] **Step 5: Commit**: `git commit -m "Document the TypeScript course and the shared code engine"`
