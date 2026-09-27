import { describe, expect, it } from 'vitest';
import { rsBuild, rsCompiles, rsError, rsFix, rsPairs, rsPredict, rsPredictError, rsType } from '../quiz/rustFixtures';
import { tsCompiles, tsInfer, tsPredict, tsPredictError, tsPredictThrows } from '../quiz/tsFixtures';
import type { CodeCourseDemo, CodeQuestion } from './types';
import type { CodeLang } from '../lib/codeLang';
import { changesTypeOnLine, validateCodeDemo, validateCodeQuestion } from './validateCode';

const check = (d: unknown, lang: CodeLang = 'rust') => {
  const errors: string[] = [];
  validateCodeDemo(d as CodeCourseDemo, lang, 'd', (where, msg) => errors.push(`${where}: ${msg}`));
  return errors;
};

describe('validateCodeDemo', () => {
  it('accepts code and code-choice demos', () => {
    expect(check({ kind: 'code', code: ['fn main() {}'] })).toEqual([]);
    expect(check({ kind: 'code', code: ['fn main() {}'], output: ['hi'] })).toEqual([]);
    expect(
      check({
        kind: 'code-choice',
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

  it('rejects bad code-choice demos', () => {
    expect(check({ kind: 'code-choice', label: 'x', opts: [{ label: 'a', code: ['a'], output: ['1'] }] })).toEqual([
      'd: code-choice demo needs 2+ options',
    ]);
    expect(
      check({
        kind: 'code-choice',
        label: 'x',
        start: 5,
        opts: [
          { label: 'a', code: ['a'] },
          { label: 'b', code: ['b'], output: ['1'] },
        ],
      }),
    ).toEqual(['d: code-choice start out of range', 'd/option a: needs exactly one of output and error']);
  });

  it('accepts thrown (with or without output) on TS demos and rejects it on Rust demos', () => {
    expect(check({ kind: 'code', code: ['x;'], output: ['a'], thrown: 'TypeError: t' }, 'ts')).toEqual([]);
    expect(check({ kind: 'code', code: ['x;'], thrown: 'TypeError: t' }, 'rust')).toEqual(['d: thrown is only for TypeScript']);
    expect(check({ kind: 'code', code: ['x;'], error: 'error TS2322: x', thrown: 'TypeError: t' }, 'ts')).toEqual([
      'd: code demo has both thrown and error',
    ]);
    expect(check({ kind: 'code', code: ['x;'], thrown: '' }, 'ts')).toEqual(['d: thrown must be a non-empty string']);
  });

  it('needs error, or output and/or thrown, on each TS code-choice option', () => {
    const demo = { kind: 'code-choice', label: 'L', opts: [{ label: 'a', code: ['x;'] }, { label: 'b', code: ['y;'], thrown: 'TypeError: t' }] };
    expect(check(demo, 'ts')).toEqual(['d/option a: needs error, or output and/or thrown']);
  });
});

const checkQ = (q: unknown) => {
  const errors: string[] = [];
  validateCodeQuestion(q as CodeQuestion, 'q', (where, msg) => errors.push(`${where}: ${msg}`));
  return errors;
};

describe('validateCodeQuestion (Rust)', () => {
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

describe('validateCodeQuestion (TypeScript)', () => {
  it('accepts every fixture', () => {
    for (const q of [tsPredict, tsPredictError, tsPredictThrows, tsInfer, tsCompiles]) expect(checkQ(q)).toEqual([]);
  });

  it('validates ts-predict outcomes', () => {
    expect(checkQ({ ...tsPredictThrows, thrown: undefined })).toContain('q: thrown is required exactly when the answer is the throws option');
    expect(checkQ({ ...tsPredict, opts: [...tsPredict.opts.slice(0, 2), { text: 'Throws', kind: 'throws' }] })).toContain(
      'q: the throws option must read "Throws at runtime"',
    );
    expect(checkQ({ ...tsPredictError, opts: [...tsPredictError.opts.slice(0, 3), { text: 'Type error', kind: 'error' }] })).toContain(
      'q: at most one error option and one throws option',
    );
    expect(checkQ({ ...rsPredict, opts: [...rsPredict.opts.slice(0, 2), { text: 'Throws at runtime', kind: 'throws' }] })).toContain(
      'q: opt 2 needs text and kind "output" or "error"',
    );
  });

  it('checks the rest of ts-predict', () => {
    expect(checkQ({ ...tsPredict, thrown: 'TypeError: x' })).toContain('q: thrown is required exactly when the answer is the throws option');
    expect(checkQ({ ...tsPredictThrows, thrown: '' })).toContain('q: thrown must be a non-empty string');
    expect(checkQ({ ...tsPredictError, error: 'error[E0382]: moved' })).toContain('q: error must look like "error TS0000: message"');
    expect(checkQ({ ...tsPredict, opts: [tsPredict.opts[0]!, tsPredict.opts[1]!, { text: 'Doesn’t compile', kind: 'error' }] })).toContain(
      'q: the error option must read "Type error"',
    );
    expect(checkQ({ ...rsPredict, thrown: 'TypeError: x' })).toContain('q: thrown is only for TypeScript');
  });

  it('validates ts-infer', () => {
    expect(checkQ(tsInfer)).toEqual([]);
    expect(checkQ({ ...tsInfer, name: 'y' })).toContain('q: name "y" does not appear on line 3');
    expect(checkQ({ ...tsInfer, code: tsInfer.code.map((l, i) => (i === 2 ? l.replace('x.', 'max.') : l)) })).toContain(
      'q: name "x" does not appear on line 3',
    );
    expect(checkQ({ ...tsInfer, line: 99 })).toContain('q: line must be a visible line number');
    expect(checkQ({ ...tsInfer, opts: ['string', 'string', 'number'] })).toContain('q: opts must be unique and non-empty');
  });

  it('checks the rest of ts-infer', () => {
    expect(checkQ({ ...tsInfer, name: 'x.length' })).toContain('q: name must be an identifier');
    expect(checkQ({ ...tsInfer, opts: ['string', '', 'number'] })).toContain('q: opts must be unique and non-empty');
    expect(checkQ({ ...tsInfer, opts: ['string', 'number'] })).toContain('q: needs 3 or 4 opts');
    expect(checkQ({ ...tsInfer, answer: 4 })).toContain('q: answer out of range');
    expect(checkQ({ ...tsInfer, prompt: 'What type is `x` on line 1?', code: ['# function f(x: string) {', 'x;', '# }'], line: 1 })).toEqual([]);
    expect(checkQ({ ...tsInfer, code: ['# const x = 1;', 'const y = 2;'], line: 1 })).toContain('q: name "x" does not appear on line 1');
  });

  it('rejects a ts-infer line that reassigns or narrows the name', () => {
    // `x` is `string | number` in the editor; the asked line is visible line 2.
    const on = (line: string) => checkQ({ ...tsInfer, prompt: 'What type does the editor show for `x` on line 2?', code: ['let x: string | number = "a" as string | number;', line], line: 2 });
    const bad = 'q: line 2 must not reassign or narrow "x"';
    // Reassignment, compound assignment, increment and decrement.
    for (const line of ['x = 5;', 'x += 1;', 'x ??= 0;', 'x **= 2;', 'x ||= "b";', 'x++;', '--x;', '[x] = [1];', 'for (x of [1]) {}']) {
      expect(on(line), line).toContain(bad);
    }
    // Narrowing: conditions that open a narrowed block, type tests, guards, assertion calls.
    for (const line of [
      'if (typeof x === "string") {',
      '} else if (x === 1) {',
      'case x:',
      'switch (x) {',
      'while (x !== 0) {',
      'if (x === 0) return;',
      'const isNum = typeof x === "number";',
      'console.log(x instanceof Date);',
      'console.log("length" in x);',
      'assertIsString(x);',
    ]) {
      expect(on(line), line).toContain(bad);
    }
    // A declaration of the name, and ordinary uses, are fine.
    for (const line of ['console.log(x.toString());', 'const y = x === 1 ? "one" : "other";', 'const f = (x: number) => x * 2;', 'console.log(x == 1, x !== 2, x <= 3);']) {
      expect(on(line), line).toEqual([]);
    }
    expect(checkQ({ ...tsInfer, prompt: 'What type does the editor show for `x` on line 1?', code: ['let x = 5;', 'console.log(x);'], line: 1 })).toEqual([]);
    expect(checkQ({ ...tsInfer, code: ['function show(x: string) {', '  const s = "a";', '  console.log(x.toUpperCase());', '}'] })).toEqual([]);
    // Annotating and initializing narrows by assignment, so the hover and check:ts would disagree.
    expect(checkQ({ ...tsInfer, prompt: 'What type does the editor show for `x` on line 1?', code: ['let x: string | number = "a";', 'console.log(x);'], line: 1 })).toContain(
      'q: line 1 must not reassign or narrow "x"',
    );
    // A property named like the variable is not the variable.
    expect(changesTypeOnLine('obj.x = 5;', 'x')).toBe(false);
    expect(changesTypeOnLine('$x = 5;', '$x')).toBe(true);
    expect(changesTypeOnLine('x$ = 5;', 'x')).toBe(false);
  });

  it('requires the ts-infer prompt to name the identifier and the line', () => {
    const bad = 'q: prompt must name `x` and line 3';
    expect(checkQ({ ...tsInfer, prompt: 'What type does the editor show here?' })).toContain(bad);
    expect(checkQ({ ...tsInfer, prompt: 'What type does the editor show for x on line 3?' })).toContain(bad);
    expect(checkQ({ ...tsInfer, prompt: 'What type does the editor show for `x` on line 30?' })).toContain(bad);
    expect(checkQ({ ...tsInfer, prompt: 'On line 3, what type is `x`?' })).toEqual([]);
  });

  it('pairs the shared ts- types with the Rust rules', () => {
    expect(checkQ(tsCompiles)).toEqual([]);
    expect(checkQ({ ...tsCompiles, error: 'error[E0382]: x' })).toContain('q: error must look like "error TS0000: message"');
    expect(checkQ({ ...tsCompiles, answer: 'c' })).toContain("q: answer must be 'a' or 'b'");
  });
});
