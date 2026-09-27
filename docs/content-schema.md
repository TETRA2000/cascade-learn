# Content schema

The schema is per course: each course has its own `content/<course>/` folder with the four files below, plus the shared `content/courses.json`. Notes marked **CSS** below are specific to that course; the Rust course's schema is under "Rust course".

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
type CourseInfo = { id: 'css' | 'rust'; name: string; tagline: string; blurb: string; icon: 'css' | 'rust' };
```
Each listed course has a folder `content/<id>/` with the four files described in this document.

## Rust course

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
