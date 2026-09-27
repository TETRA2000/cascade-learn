import { describe, expect, it } from 'vitest';
import { rsBuild, rsCompiles, rsError, rsFix, rsPairs, rsPredict, rsPredictError, rsType } from '../quiz/rustFixtures';
import type { RustDemo, RustQuestion } from './types';
import { validateRustDemo, validateRustQuestion } from './validateRust';

const check = (d: unknown) => {
  const errors: string[] = [];
  validateRustDemo(d as RustDemo, 'd', (where, msg) => errors.push(`${where}: ${msg}`));
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
  validateRustQuestion(q as RustQuestion, 'q', (where, msg) => errors.push(`${where}: ${msg}`));
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
  ])('rejects %s', (_name, q, message) => {
    expect(checkQ(q)).toContain(message);
  });
});
