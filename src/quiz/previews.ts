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
