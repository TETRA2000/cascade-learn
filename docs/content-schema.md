# Content schema

The schema is per course: each course has its own `content/<course>/` folder with the four files below, plus the shared `content/courses.json`. Notes marked **CSS** below are specific to that course; the code courses' (Rust, TypeScript) schema is under "Code courses (Rust, TypeScript)".

In body, tip, explain, prompt and note text, text between backticks renders as inline code.

**CSS:** style strings are inline CSS declarations applied with real CSS. In code arrays, a line starting with `§` is HTML (render grey, drop the `§`).

## lessons.json — `Unit[]`

```ts
type Unit = { key: string; name: string; blurb: string; cards: Card[] };
type Card = { title: string; body: string; tip?: string; demo?: KnobDemo | ChoiceDemo };

type KnobDemo = {
  base: string;                       // stage (parent) CSS
  kids: { s: string; t: string; w?: string }[];  // child CSS, text, optional wrapper CSS (default display:contents)
  show?: Record<string, string[]>;    // fixed declarations shown in the code panel, grouped by selector
  knobs: { prop: string; opts: string[]; target: 'parent' | 'kids' | number; sel: string; start?: number }[];
  legend?: { sw: string; l: string }[];
};
// Code panel = for each selector group: `sel {`, `  prop: value;` lines (show first, then knobs), `}`.

type ChoiceDemo = {
  kind: 'choice'; label: string; start?: number; base: string;
  opts: { label: string; code: string[]; kids: { s: string; t: string }[]; note?: string }[];
};
```

## questions.json — `Question[]` (common: `id`, `type`, `prompt`, `explain`)

| type | extra fields | correct when |
|---|---|---|
| `predict` | `code[]`, `stage`, `kids[]` (CSS strings), `opts[{ s, d, kids? }]`, `answer` (index) | selected index === answer |
| `pairs` | `items[{ id, code, shape, text, label }]` (4), `order[]` (right-column order) | all 4 matched (auto) |
| `versus` | `code[]`, `opts[]` (color keywords), `answer`, `scores[{ sel, score, win }]` | selected === answer |
| `build` | `apply` ('parent' / 'child'), `boxBase`, `kids[{ s, t }]`, `code[]` (strings or `{ slot }`), `props[]`, `defaults[]`, `answer[]`, `bank[]` (may repeat words) | every slot's word === answer[i] |
| `tune` | `prop`, `unit`, `min`, `max`, `step`, `start`, `target`, `apply`, `count`, `text`, `ghost`, `yours` | value === target |
| `bug` | `stage`, `expected{ s, t }`, `actual{ s, t }`, `code[]`, `answer` (1-based line) | selected line === answer |
| `type` | `sel`, `prop`, `accept[]`, `text`, `base` | sanitized input (`[a-zA-Z-]`, lowercase) ∈ accept |

Word-bank chips are tracked by **index**, not word, because `bank` can contain duplicates.

## topics.json — `Record<unitKey, questionId[]>`
## question-types.json — `{ key, name, blurb }[]` in difficulty order

## courses.json — `CourseInfo[]` (picker order)

```ts
type CourseInfo = { id: 'css' | 'rust' | 'ts'; name: string; tagline: string; blurb: string; icon: 'css' | 'rust' | 'ts' };
```
Each listed course has a folder `content/<id>/` with the four files described in this document.

## Code courses (Rust, TypeScript)

Rust and TypeScript share one set of shapes, generic over a course-prefixed key (`rs-foo` / `ts-foo` below). Code arrays are plain code (Rust or TS). A line starting with `# ` (or exactly `#`) is hidden setup: compiled/type-checked by `npm run check:rust`/`npm run check:ts`, never shown (rustdoc's convention, reused for TS). Displayed line numbers count visible lines only. `error` strings are the compiler's first error line: rustc's `` error[E0382]: borrow of moved value: `s` `` or tsc 7.0.2's `error TS2322: Type 'string' is not assignable to type 'number'.`.

### Demos
```ts
type CodeDemo = { kind: 'code'; code: string[]; output?: string[]; error?: string; thrown?: string };
type CodeChoiceDemo = { kind: 'code-choice'; label: string; start?: number;
  opts: { label: string; code: string[]; output?: string[]; error?: string; thrown?: string; note?: string }[] };
```
`thrown` (TS only; Node's `String(error)`) never appears with `error`, but may appear with `output` (the program printed that, then threw). In a `CodeDemo`, at most one of `output`/`error`. In a `code-choice` option, Rust needs exactly one of `output`/`error`; TypeScript needs `error`, or `output` and/or `thrown`.

### Questions
```ts
{ type: 'rs-predict' | 'ts-predict'; code: string[];
  opts: { text: string; kind: 'output' | 'error' | 'throws' }[];                             // 'throws' is TS-only; at most one error and one throws option
  answer: number; error?: string; thrown?: string }
// error iff answer is the error option; thrown (TS only) iff answer is the throws option.
// An 'error' option's text is exactly "Type error" (TS) / "Doesn’t compile" (Rust); a 'throws' option's text is exactly "Throws at runtime".
{ type: 'rs-pairs' | 'ts-pairs'; items: { id: string; left: string; right: string }[]; order: string[] }                    // 4 items
{ type: 'rs-compiles' | 'ts-compiles'; a: string[]; b: string[]; answer: 'a' | 'b'; error: string }                         // error = what the compiler says about the other
{ type: 'rs-build' | 'ts-build'; code: (string | (string | { slot: number })[])[]; bank: string[]; answer: string[]; output?: string[] } // inline slots
{ type: 'rs-error' | 'ts-error'; code: string[]; answer: number; error: string }                                            // answer = visible line
{ type: 'rs-fix' | 'ts-fix'; code: string[]; error: string; opts: { diff: string[] }[]; answer: number }                    // diff: "- old" lines (contiguous in code), then "+ new"
{ type: 'rs-type' | 'ts-type'; code: string[]; accept: string[] }                                                            // one ___ blank; accept is normalized
```

### TypeScript only: `ts-infer` ("Hover the type")
```ts
{ type: 'ts-infer'; code: string[]; line: number; name: string; opts: string[]; answer: number }
```
`line` is a 1-based visible line where `name` (a whole-word identifier on that line) already has the type being asked about, and that line must not itself narrow or reassign `name`. `opts` are type texts (e.g. `string | number`, `"a"`, `never`); each option tile reads `name: <type>`. Correct when the selected index equals `answer`.
