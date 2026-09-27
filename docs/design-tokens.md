# Design tokens

## Color

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FBF8F2` | App background (warm ivory) |
| `--surface` | `#FFFFFF` | Cards, tiles |
| `--surface-muted` | `#F3F0E8` | Table headers, matched pairs |
| `--line` | `#E4DFD4` | Borders, progress track |
| `--ink` | `#1D1B26` | Primary text, code panel background |
| `--ink-muted` | `#5B5868` | Secondary text |
| `--primary` | `#4338CA` | Primary buttons, progress, selection |
| `--primary-deep` | `#2E2690` | Primary button bottom edge |
| `--primary-soft` | `#EEF0FF` | Selected tile background, chips |
| `--accent` | `#E4572E` | Hearts, demo items, "yours" previews |
| `--correct` | `#15803D` / bg `#E3F4E8` / edge `#0F5E2C` | Correct feedback |
| `--wrong` | `#B4461B` / bg `#FCEBDF` / edge `#8A3413` | Wrong feedback |
| `--learn` | `#E3A008` bar, `#FFF7DB` bg, `#F2D675` border, `#8A5A00` text | Learn progress, key-idea callout, unit badges |

Code syntax (on `--ink`): selector `#F9A8D4`, property `#A5B4FC`, value `#FCD34D`, punctuation `#D6D3E0`, HTML/comment `#9C98B3`.

Rust code syntax (on `--ink`), from `src/styles/tokens.css`: `--code-keyword` `#F9A8D4` (9.4:1), `--code-type` `#7DD3FC` (10.2:1), `--code-string` `#86EFAC` (12.1:1), `--code-number` `#FCD34D` (11.8:1), `--code-comment` `#9C98B3` (6.1:1), `--code-lifetime` `#FDBA74` (10.1:1), `--code-macro` `#C4B5FD` (9.2:1), `--code-add` `#86EFAC` (12.1:1), `--code-del` `#FCA5A5` (8.9:1).

## Type

- Display: **Bricolage Grotesque** 700/800 (titles, feedback headings, numbers).
- Body: **DM Sans** 400/500/700.
- Code: **JetBrains Mono** 400/600, 13–14px.
- Sizes: prompt 24–26px, feedback title 22px, body 15–16px, labels 12–13px uppercase with 0.08em tracking.

## Shape and spacing

- Radius: tiles/buttons 16px, chips 12px, code panel 16px, hero cards 20px, pills 999px.
- 3D button: 2px border + 4–5px bottom border in a darker shade.
- Screen padding 20px; vertical rhythm 8/12/14/16px gaps.
- Phone frame 390×844; min touch target 44px; primary buttons 52px tall.

## Components (see `reference/design-canvas/Prototype.dc.html`)

Header (quit, progress, hearts) · Type chip · Prompt · Code panel · Option tile (idle / selected / correct / wrong) · Word-bank chip (idle / used ghost) · Blank slot (empty dashed / filled) · Stepper · Feedback sheet · Knob chip group · Key-idea callout · Unit tile · Bottom tab bar · Results stat tiles.
