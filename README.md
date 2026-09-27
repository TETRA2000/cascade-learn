# Cascade

A Duolingo-style mobile app for learning to code, one course at a time: short **Learn** lessons with live playgrounds, then bite-sized **Practice** quizzes. 5 hearts per lesson, missed questions come back at the end, XP for first-try answers.

| Course | Learn | Practice |
|---|---|---|
| CSS | 5 units, 19 cards, knob and choice playgrounds drawn with real CSS | 22 questions in 7 types: Predict the render, Match pairs, Which rule wins?, Word bank, Tune to target, Spot the bug, Type the value |
| Rust | 1 unit (Ownership & moves), 5 cards with code and choice demos | 7 questions in 7 types: Predict the output, Match pairs, Compiles?, Word bank, Spot the error, Fix it, Type the token |

Start with `CLAUDE.md`.

## Develop

- `npm run dev` — start the app (Vite).
- `npm test` — unit and component tests (Vitest).
- `npm run test:e2e` — browser tests (Playwright; first run `npx playwright install chromium`).
- `npm run typecheck` — TypeScript for the app and `scripts/`.
- `npm run check:rust` — compile every Rust snippet in `content/rust` with the toolchain pinned in `rust-toolchain.toml` and check it against its authored output or error.
- `npm run build` — type-check and build to `dist/`.

CI (`.github/workflows/ci.yml`) runs all of the above on pushes to `main` and on pull requests.

Progress (active course; per course: completed units, practice sets, XP) is stored in `localStorage` under `cascade.progress.v2`. Progress from before courses existed (`cascade.progress.v1`) is migrated into the CSS course on first load.
