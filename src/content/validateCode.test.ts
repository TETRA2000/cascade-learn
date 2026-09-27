import { describe, expect, it } from 'vitest';
import { rsBuild, rsCompiles, rsError, rsFix, rsPairs, rsPredict, rsPredictError, rsType } from '../quiz/rustFixtures';
import type { CodeCourseDemo, CodeQuestion } from './types';
import { validateCodeDemo, validateCodeQuestion } from './validateCode';

const check = (d: unknown) => {
  const errors: string[] = [];
  validateCodeDemo(d as CodeCourseDemo, 'rust', 'd', (where, msg) => errors.push(`${where}: ${msg}`));
  return errors;
};

describe('validateRustDemo', () => {
  it('accepts code and rs-choice demos', () => {
    expect(check({ kind: 'code', code: ['fn main() {}'] })).toEqual([]);
    expect(check({ kind: 'code', code: ['fn main() {}'], output: ['hi'] })).toEqual([]);
    expect(
      check({
        kind: 'rs-choice',
        label: 'x',
        opts: [
          { label: 'a', code: ['a'], output: ['1'] },
          { label: 'b', code: ['b'], error: 'error[E0382]: moved' },
        ],
      }),
    ).toEqual([]);
  });

  it('rejects bad code demos', () => {
    expect(check({ kind: 'code', code: ['# hidden only'] })).toEqual(['d: code demo needs visible code']);
    expect(check({ kind: 'code', code: ['x'], output: ['1'], error: 'error[E0382]: m' })).toEqual(['d: code demo has both output and error']);
    expect(check({ kind: 'code', code: ['x'], error: 'moved' })).toEqual(['d: error must look like "error[E0000]: message"']);
  });

  it('rejects bad rs-choice demos', () => {
    expect(check({ kind: 'rs-choice', label: 'x', opts: [{ label: 'a', code: ['a'], output: ['1'] }] })).toEqual([
      'd: rs-choice demo needs 2+ options',
    ]);
    expect(
      check({
        kind: 'rs-choice',
        label: 'x',
        start: 5,
        opts: [
          { label: 'a', code: ['a'] },
          { label: 'b', code: ['b'], output: ['1'] },
        ],
      }),
    ).toEqual(['d: rs-choice start out of range', 'd/option a: needs exactly one of output and error']);
  });
});

const checkQ = (q: unknown) => {
  const errors: string[] = [];
  validateCodeQuestion(q as CodeQuestion, 'q', (where, msg) => errors.push(`${where}: ${msg}`));
  return errors;
};

describe('validateRustQuestion', () => {
  it('accepts every fixture', () => {
    for (const q of [rsPredict, rsPredictError, rsPairs, rsCompiles, rsBuild, rsError, rsFix, rsType]) expect(checkQ(q)).toEqual([]);
  });

  it.each([
    ['an error on an output answer', { ...rsPredict, error: 'error[E0382]: x' }, 'q: error is required exactly when the answer is the error option'],
    ['a missing error on an error answer', { ...rsPredictError, error: undefined }, 'q: error is required exactly when the answer is the error option'],
    ['too few predict options', { ...rsPredict, opts: rsPredict.opts.slice(0, 2) }, 'q: needs 3 or 4 opts'],
    ['a pairs question without 4 items', { ...rsPairs, items: rsPairs.items.slice(0, 3) }, 'q: needs exactly 4 items'],
    ['an unknown compiles answer', { ...rsCompiles, answer: 'c' }, "q: answer must be 'a' or 'b'"],
    ['a malformed error', { ...rsCompiles, error: 'borrow of moved value' }, 'q: error must look like "error[E0000]: message"'],
    ['a slot gap', { ...rsBuild, code: [['x', { slot: 1 }]] }, 'q: code must contain each slot 0..n-1 exactly once'],
    ['a bank missing an answer word', { ...rsBuild, bank: ['&String'] }, 'q: bank is missing answer word "&name"'],
    ['an error line past the end', { ...rsError, answer: 6 }, 'q: answer must be a visible line number'],
    ['a diff that does not apply', { ...rsFix, opts: [...rsFix.opts, { diff: ['- nope', '+ x'] }] }, 'q: option D diff does not apply to code'],
    ['a diff line without a prefix', { ...rsFix, opts: [...rsFix.opts, { diff: ['let t = s;'] }] }, 'q: option D diff lines must start with "- " or "+ "'],
    ['two blanks', { ...rsType, code: ['___ ___'] }, 'q: code needs exactly one ___ blank'],
    ['an accept that can never match', { ...rsType, accept: [' &mut'] }, 'q: accept " &mut" can never match normalized input'],
    [
      'a diff that removes a hidden line',
      {
        ...rsFix,
        code: ['fn main() {', '# let extra = 1;', ...rsFix.code.slice(1)],
        opts: [{ diff: ['- # let extra = 1;', '+ // nothing'] }, rsFix.opts[1]!, rsFix.opts[2]!],
      },
      'q: option A diff must only remove visible lines',
    ],
    [
      'a ___ blank on a hidden line',
      { ...rsType, code: ['# fn add_one(v: ___ Vec<i32>) {', '    v.push(1);', '}'] },
      'q: the ___ blank must be on a visible line',
    ],
    [
      'a predict error option that does not read "Doesn’t compile"',
      { ...rsPredict, opts: [rsPredict.opts[0]!, rsPredict.opts[1]!, { ...rsPredict.opts[2]!, text: "Doesn't compile" }] },
      'q: the error option must read "Doesn’t compile"',
    ],
  ])('rejects %s', (_name, q, message) => {
    expect(checkQ(q)).toContain(message);
  });
});
