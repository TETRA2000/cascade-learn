import { describe, expect, it } from 'vitest';
import type { RustDemo } from './types';
import { validateRustDemo } from './validateRust';

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
