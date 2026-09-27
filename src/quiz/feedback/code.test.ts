import { describe, expect, it } from 'vitest';
import type { Question } from '../../content';
import { freshAnswer } from '../grade';
import { rsBuild, rsCompiles, rsError, rsFix, rsPairs, rsPredict, rsPredictError, rsType } from '../rustFixtures';
import type { AnswerState } from '../types';
import { feedbackText } from './index';

const fb = (q: Question, patch: Partial<AnswerState>) => feedbackText(q, { ...freshAnswer(q), checked: true, ...patch }, 0);

describe('Rust feedback', () => {
  it('praises a right answer and shows rustc’s message for error questions', () => {
    expect(fb(rsFix, { ok: true, sel: 0 })).toEqual({ title: 'Nice — that’s right!', detail: null, compiler: rsFix.error });
  });

  it('gives the answer when wrong', () => {
    expect(fb(rsPredict, { ok: false, sel: 1 })).toEqual({ title: 'Not quite', detail: 'Answer: A' });
    expect(fb(rsCompiles, { ok: false, sel: 'a' }).detail).toBe('Answer: B');
    expect(fb(rsBuild, { ok: false }).detail).toBe('Answer: &String, &name');
    expect(fb(rsType, { ok: false }).detail).toBe('Answer: &mut');
    expect(fb(rsError, { ok: false, sel: 2 })).toEqual({ title: 'Not that one — it’s line 4', detail: null, compiler: rsError.error });
  });

  it('shows rustc’s message only when the question is about a compile error', () => {
    expect(fb(rsPredictError, { ok: true }).compiler).toBe(rsPredictError.error);
    expect(fb(rsPredict, { ok: true }).compiler).toBeUndefined();
    expect(fb(rsType, { ok: true }).compiler).toBeUndefined();
  });

  it('always reports mismatches for rs-pairs', () => {
    expect(fb(rsPairs, { ok: true, misses: 2 })).toEqual({ title: 'All pairs matched!', detail: '2 mismatches along the way.' });
  });
});
