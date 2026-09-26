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
