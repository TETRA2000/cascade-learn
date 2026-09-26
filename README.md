# Cascade (working title)

A Duolingo-style mobile app for learning CSS: short **Learn** lessons with live playgrounds, then bite-sized **Practice** quizzes in 7 question formats.

Status: design prototype handed off for implementation. Start with `CLAUDE.md`.

- Learn: 5 units (How CSS works, The box model, Flexbox basics, Grid basics, Common properties), 19 cards.
- Practice: 22 questions across 7 types (Predict the render, Match pairs, Which rule wins?, Word bank, Tune to target, Spot the bug, Type the value).
- Game loop: 5 hearts, missed questions return at the end, XP for first-try answers.

## Develop

- `npm run dev` — start the app (Vite).
- `npm test` — unit and component tests (Vitest).
- `npm run test:e2e` — browser smoke test (Playwright; first run `npx playwright install chromium`).
- `npm run build` — type-check and build to `dist/`.

Progress (completed units, practice sets, XP) is stored in `localStorage` under `cascade.progress.v1`.
