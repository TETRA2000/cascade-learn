# Content schema

All style strings are inline CSS declarations applied with real CSS. In explanation/body/tip text, text between backticks renders as inline code. In code arrays, a line starting with `§` is HTML (render grey, drop the `§`).

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
