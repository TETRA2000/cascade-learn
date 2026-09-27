import { describe, expect, it } from 'vitest';
import type { Question, Unit } from '../src/content/types';
import { rsBuild, rsCompiles, rsError, rsFix, rsPairs, rsPredict, rsType } from '../src/quiz/rustFixtures';
import { collectSnippets, errorCode, firstError, judge, type Snippet } from './rust-check-lib.ts';

describe('errorCode', () => {
  it('reads the code from an authored error', () => {
    expect(errorCode('error[E0382]: borrow of moved value: `s`')).toBe('E0382');
    expect(errorCode('borrow of moved value')).toBeNull();
  });
});

describe('firstError', () => {
  it('reads the first error’s code and primary line from rustc JSON', () => {
    const stderr = [
      JSON.stringify({ $message_type: 'diagnostic', level: 'warning', code: { code: 'unused_variables' }, spans: [{ line_start: 2, is_primary: true }] }),
      JSON.stringify({
        $message_type: 'diagnostic',
        level: 'error',
        code: { code: 'E0382' },
        spans: [
          { line_start: 3, is_primary: false },
          { line_start: 5, is_primary: true },
        ],
      }),
      JSON.stringify({ $message_type: 'diagnostic', level: 'error', code: null, spans: [] }),
      'not json',
    ].join('\n');
    expect(firstError(stderr)).toEqual({ errorCode: 'E0382', line: 5 });
  });

  it('copes with no diagnostics', () => {
    expect(firstError('')).toEqual({ errorCode: null, line: null });
  });
});

describe('judge', () => {
  const code = ['# fn main() {', 'let a = 1;', 'let b = a;', '# }'];
  const snippet = (expect: Snippet['expect']): Snippet => ({ where: 'q', code, expect });

  it('passes matching results, mapping rustc lines to visible lines', () => {
    expect(judge(snippet({ kind: 'compiles' }), { ok: true, stdout: '' })).toBeNull();
    expect(judge(snippet({ kind: 'output', output: ['5 6'] }), { ok: true, stdout: '5 6\n' })).toBeNull();
    expect(judge(snippet({ kind: 'error', code: 'E0382', line: 2 }), { ok: false, errorCode: 'E0382', line: 3 })).toBeNull();
  });

  it('explains every kind of mismatch', () => {
    expect(judge(snippet({ kind: 'error', code: 'E0382' }), { ok: true, stdout: '' })).toBe('expected a compile error, but it compiled');
    expect(judge(snippet({ kind: 'error', code: 'E0382' }), { ok: false, errorCode: 'E0499', line: 2 })).toBe('expected E0382, rustc reported E0499');
    expect(judge(snippet({ kind: 'error', code: 'E0382', line: 1 }), { ok: false, errorCode: 'E0382', line: 3 })).toBe(
      'expected the error on line 1, rustc points at line 2',
    );
    expect(judge(snippet({ kind: 'error', code: 'E0382', line: 1 }), { ok: false, errorCode: 'E0382', line: 4 })).toBe(
      'expected the error on line 1, rustc points at a hidden line',
    );
    expect(judge(snippet({ kind: 'compiles' }), { ok: false, errorCode: 'E0308', line: 2 })).toBe('expected it to compile, rustc reported E0308');
    expect(judge(snippet({ kind: 'output', output: ['5 6'] }), { ok: true, stdout: '5 5\n' })).toBe('expected output "5 6", got "5 5"');
  });

  it('fails a compiled snippet that fails at runtime, even when its stdout matches', () => {
    expect(judge(snippet({ kind: 'compiles' }), { ok: true, stdout: '', runError: 'exited with code 101' })).toBe(
      'program failed at runtime: exited with code 101',
    );
    expect(judge(snippet({ kind: 'output', output: ['5 6'] }), { ok: true, stdout: '5 6\n', runError: 'exited with code 101' })).toBe(
      'program failed at runtime: exited with code 101',
    );
    expect(judge(snippet({ kind: 'error', code: 'E0382' }), { ok: true, stdout: '', runError: 'timed out after 5s' })).toBe(
      'expected a compile error, but it compiled',
    );
  });
});

describe('collectSnippets', () => {
  const units = [
    {
      key: 'u',
      name: 'U',
      blurb: '',
      cards: [
        { title: 'a', body: '', demo: { kind: 'code', code: ['fn main() {}'] } },
        {
          title: 'b',
          body: '',
          demo: {
            kind: 'code-choice',
            label: 'x',
            opts: [
              { label: 'one', code: ['A'], output: ['1'] },
              { label: 'two', code: ['B'], error: 'error[E0499]: m' },
            ],
          },
        },
      ],
    },
  ] as unknown as Unit[];

  it('turns demos and questions into compile checks', () => {
    const { snippets, problems } = collectSnippets(units, [rsPredict, rsPairs, rsCompiles, rsBuild, rsError, rsFix, rsType]);
    expect(problems).toEqual([]);
    expect(snippets.map((s) => [s.where, s.expect])).toEqual([
      ['u/card 1', { kind: 'compiles' }],
      ['u/card 2/one', { kind: 'output', output: ['1'] }],
      ['u/card 2/two', { kind: 'error', code: 'E0499' }],
      ['rs-predict-1', { kind: 'output', output: ['5 6'] }],
      ['rs-compiles-1/b', { kind: 'compiles' }],
      ['rs-compiles-1/a', { kind: 'error', code: 'E0382' }],
      ['rs-build-1', { kind: 'output', output: ['ferris FERRIS'] }],
      ['rs-error-1', { kind: 'error', code: 'E0382', line: 4 }],
      ['rs-fix-1', { kind: 'error', code: 'E0382' }],
      ['rs-fix-1/option A', { kind: 'compiles' }],
      ['rs-fix-1/option B', { kind: 'error', code: null }],
      ['rs-fix-1/option C', { kind: 'error', code: null }],
      ['rs-type-1/&mut', { kind: 'compiles' }],
      ['rs-type-1/& mut', { kind: 'compiles' }],
    ]);
    const code = (where: string) => snippets.find((s) => s.where === where)!.code;
    expect(code('rs-build-1')[0]).toBe('fn shout(s: &String) -> String {');
    expect(code('rs-fix-1/option A')[2]).toBe('    let t = s.clone();');
    expect(code('rs-type-1/&mut')[0]).toBe('fn add_one(v: &mut Vec<i32>) {');
  });

  it('reports a fix diff that no longer applies', () => {
    const broken = { ...rsFix, opts: [{ diff: ['- gone', '+ x'] }, ...rsFix.opts.slice(1)] };
    expect(collectSnippets([], [broken]).problems).toEqual(['rs-fix-1/option A: diff does not apply to the code']);
  });

  it('has nothing to compile for rs-pairs or a CSS question type', () => {
    const cssPredict = {
      id: 'predict-1',
      type: 'predict',
      prompt: 'p',
      explain: 'e',
      code: [],
      stage: '',
      kids: [],
      opts: [],
      answer: 0,
    } as unknown as Question;
    const { snippets, problems } = collectSnippets([], [rsPairs, cssPredict]);
    expect(snippets).toEqual([]);
    expect(problems).toEqual([]);
  });
});
