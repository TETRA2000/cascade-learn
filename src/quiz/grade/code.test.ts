import { describe, expect, it } from 'vitest';
import type { Question } from '../../content';
import { rsBuild, rsCompiles, rsError, rsFix, rsPairs, rsPredict, rsType } from '../rustFixtures';
import { tsCompiles, tsInfer, tsPredictThrows } from '../tsFixtures';
import type { AnswerState } from '../types';
import { canCheck, freshAnswer, isCorrect } from './index';

const answer = (q: Question, patch: Partial<AnswerState> = {}): AnswerState => ({ ...freshAnswer(q), ...patch });

describe('Rust grading', () => {
  it('starts rs-build slots empty', () => {
    expect(freshAnswer(rsBuild).slots).toEqual([null, null]);
  });

  it('grades single picks', () => {
    for (const q of [rsPredict, rsFix]) {
      expect(canCheck(q, answer(q))).toBe(false);
      expect(canCheck(q, answer(q, { sel: 1 }))).toBe(true);
      expect(isCorrect(q, answer(q, { sel: 0 }))).toBe(true);
      expect(isCorrect(q, answer(q, { sel: 1 }))).toBe(false);
    }
    expect(isCorrect(rsCompiles, answer(rsCompiles, { sel: 'b' }))).toBe(true);
    expect(isCorrect(rsCompiles, answer(rsCompiles, { sel: 'a' }))).toBe(false);
    expect(isCorrect(rsError, answer(rsError, { sel: 4 }))).toBe(true);
    expect(isCorrect(rsError, answer(rsError, { sel: 3 }))).toBe(false);
  });

  it('grades rs-build by the words placed, not their bank positions', () => {
    expect(canCheck(rsBuild, answer(rsBuild, { slots: [1, null] }))).toBe(false);
    expect(isCorrect(rsBuild, answer(rsBuild, { slots: [1, 3] }))).toBe(true);
    expect(isCorrect(rsBuild, answer(rsBuild, { slots: [0, 3] }))).toBe(false);
  });

  it('normalizes typed tokens but keeps case', () => {
    expect(canCheck(rsType, answer(rsType, { val: '   ' }))).toBe(false);
    expect(isCorrect(rsType, answer(rsType, { val: '  &mut  ' }))).toBe(true);
    expect(isCorrect(rsType, answer(rsType, { val: '&  mut' }))).toBe(true);
    expect(isCorrect(rsType, answer(rsType, { val: '&MUT' }))).toBe(false);
  });

  it('never offers Check for rs-pairs; it completes when every pair is matched', () => {
    expect(canCheck(rsPairs, answer(rsPairs))).toBe(false);
    expect(isCorrect(rsPairs, answer(rsPairs, { matched: { own: true, shr: true, mut: true } }))).toBe(false);
    expect(isCorrect(rsPairs, answer(rsPairs, { matched: { own: true, shr: true, mut: true, cln: true } }))).toBe(true);
  });
});

describe('TypeScript grading', () => {
  it('grades ts-infer and ts-predict by the picked option', () => {
    for (const q of [tsInfer, tsPredictThrows]) {
      expect(canCheck(q, answer(q))).toBe(false);
      expect(isCorrect(q, answer(q, { sel: q.answer }))).toBe(true);
      expect(isCorrect(q, answer(q, { sel: (q.answer + 1) % q.opts.length }))).toBe(false);
    }
  });

  it('grades the shared ts- types like their Rust pairs', () => {
    expect(canCheck(tsCompiles, answer(tsCompiles, { sel: 'a' }))).toBe(true);
    expect(isCorrect(tsCompiles, answer(tsCompiles, { sel: 'b' }))).toBe(true);
    expect(isCorrect(tsCompiles, answer(tsCompiles, { sel: 'a' }))).toBe(false);
  });
});
