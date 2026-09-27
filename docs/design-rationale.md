# Design rationale

## Learning sequence

Recognize before you produce. Each lesson moves from low-effort recognition to free recall:

1. **Match pairs** — warm-up vocabulary.
2. **Predict the render** — read CSS, pick the picture.
3. **Which rule wins?** — specificity and the cascade.
4. **Word bank** — fill blanks from chips; live preview.
5. **Tune to target** — adjust a value to match a ghost outline.
6. **Spot the bug** — find the silently failing line.
7. **Type the value** — free recall, no options.

Learn cards come before practice: each unit teaches the idea with a playground, then "Practice this" runs questions tagged for that unit (`content/topics.json`).

## Question types

| Type | Why it exists |
|---|---|
| Predict the render | Reading comes before writing. Mapping code → picture builds a mental renderer. Distractors are real misconceptions (e.g. mixing up `justify-content` and `align-items`). Options are drawn with real CSS, so they can never be wrong. |
| Match pairs | Fast, low-stakes vocabulary drill. The right column is visual, so learners link property → effect, not word → word. Checks on every tap. Costs no hearts. |
| Which rule wins? | Two or three choices, one concept: the cascade. Targets the "later rule always wins" trap. The reveal shows specificity scores so the rule sticks, not just the answer. |
| Word bank | Duolingo's word bank adapted to syntax: recall with guardrails, no typos. The live preview renders wrong picks too (e.g. `flex` + `place-items: center` only centers vertically), which teaches why. |
| Tune to target | CSS is visual — train the eye for spacing. Direct manipulation with instant feedback, like nudging a value in DevTools. The dashed ghost makes "close but not quite" visible. |
| Spot the bug | Real CSS work is mostly debugging, and CSS fails silently. Expected-vs-actual mirrors how developers spot bugs; tapping a line is easy on a phone. |
| Type the value | Hardest step: free recall. Use late in a lesson. Live preview rewards partial progress and makes misspellings visibly fail. |

## Cross-cutting decisions

- **One stable frame.** Progress bar, hearts, one question per screen, Check in the thumb zone. Only the middle changes.
- **Every answer teaches.** Feedback always explains the rule, right or wrong.
- **Mistakes come back.** A wrong answer is re-queued at the end of the lesson; XP is lower on the retry.
- **Tactile controls.** Chunky 3D buttons (thicker bottom border) for satisfying rapid tapping; ≥44px targets.
- **Code looks like code.** Dark editor panel with syntax colors so skills transfer to real tools.
- **Accessible feedback.** Correct/incorrect differ in lightness and use ✓/✕ icons, not just green/red.
- **Deliberate breakage in Learn.** Demos let learners break things safely (a selector matching nothing, white text on white) — failure is memorable.

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

## TypeScript course

The audience is programmers who know other languages but not JavaScript or TypeScript, so the course teaches JS runtime semantics *through* TS rather than assuming it. It reuses the Rust course's shared shapes (Predict the output, Match pairs, Type-checks?, Word bank, Spot the type error, Fix it, Type the token) and adds one type of its own:

| Type | Why |
|---|---|
| Hover the type | TypeScript's types are erased before anything runs — there's no `console.log` for "what type is this", so a real TS programmer's actual feedback loop is the editor's hover tooltip, not the terminal. This question puts that hover front and center: the marked identifier gets a dotted underline plus a small "hover" tag, and each option tile reads `name: <type>`, so noticing a narrowed type (inside `if (typeof x === "string") {`, `x` is `string`) becomes something the learner recognizes on sight, the same way they will in their editor, rather than something they have to work out from first principles every time. |

Predict the output also gains a `throws` outcome, alongside its `output` and `Type error` options. This is deliberate, not an edge case: a learner arriving from a statically-typed language expects "it type-checks" to mean "it's safe", but `--strict` still leaves real gaps a newcomer needs to see early — the clearest is reading past the end of an array (`words[5].toUpperCase()`), which type-checks (`noUncheckedIndexedAccess` stays off, matching most real projects) yet fails at runtime once `words[5]` turns out to be `undefined`. Making "type-checks and still throws" a first-class, nameable outcome — labelled "Throws at runtime" next to "Type error", with Node's own message shown under "Node says" — teaches the JS/TS split between compile-time and runtime failure that this audience doesn't yet have a feel for, instead of leaving it as a surprise they hit later in real code.
