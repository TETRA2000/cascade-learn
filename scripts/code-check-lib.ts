// Pure logic shared by the content checkers (check-rust.ts, and later a TS counterpart):
// which snippets to compile, what each must do, and how to read a compiler's JSON diagnostics.
// The checker scripts do the I/O.
import type { Question, Unit } from '../src/content/types';
import { applyDiff, fillBlank, fillSlots, insertAfterVisibleLine, programLineOfVisible, visibleLineNumber } from '../src/lib/code.ts';

export type Expect =
  | { kind: 'compiles' }
  | { kind: 'output'; output: string[] }
  /** `code` null = any error. `line` is a 1-based visible line; `programLine` is a 1-based
   * program line (for inserted assertions, which have no visible-code line of their own). */
  | { kind: 'error'; code: string | null; line?: number; programLine?: number }
  /** TS only: the program must throw at runtime, with output up to the point it throws. */
  | { kind: 'throws'; thrown: string; output?: string[] };

export interface Snippet {
  /** Where it came from, for the report (e.g. `rs-fix-1/option B`). */
  where: string;
  /** Content lines, hidden `# ` lines included. */
  code: string[];
  expect: Expect;
}

export type CompileResult =
  | {
      ok: true;
      stdout: string;
      /** The program compiled but exited non-zero, was killed, or timed out. */
      runError?: string;
      /** TS only: what the program threw at runtime (Node's `String(error)`). */
      thrown?: string;
    }
  | { ok: false; errorCode: string | null; line: number | null };

/** `error[E0382]: …` → `E0382`; `error TS2322: …` → `TS2322`. */
export function errorCode(message: string): string | null {
  return /^error\[(E\d{4})\]/.exec(message)?.[1] ?? /^error (TS\d+):/.exec(message)?.[1] ?? null;
}

/** ts-infer's hidden check for option `i`: compiles only when `name`'s type at that point is exactly `type`.
 * `__Eq` is declared by the TS checker; a mismatch is TS2322 (`true` is not assignable to `false`). */
export function inferAssertion(i: number, name: string, type: string): string {
  return `# const __ok${i}: __Eq<typeof ${name}, ${type}> = true;`;
}

function resultExpect(r: { output?: string[]; error?: string; thrown?: string }): Expect {
  if (r.thrown !== undefined) return { kind: 'throws', thrown: r.thrown, output: r.output };
  if (r.error !== undefined) return { kind: 'error', code: errorCode(r.error) };
  if (r.output !== undefined) return { kind: 'output', output: r.output };
  return { kind: 'compiles' };
}

export function collectSnippets(units: readonly Unit[], questions: readonly Question[]): { snippets: Snippet[]; problems: string[] } {
  const snippets: Snippet[] = [];
  const problems: string[] = [];
  const add = (where: string, code: readonly string[], expect: Expect) => snippets.push({ where, code: [...code], expect });

  for (const unit of units) {
    unit.cards.forEach((card, i) => {
      const where = `${unit.key}/card ${i + 1}`;
      const demo = card.demo;
      if (demo?.kind === 'code') add(where, demo.code, resultExpect(demo));
      if (demo?.kind === 'code-choice') demo.opts.forEach((o) => add(`${where}/${o.label}`, o.code, resultExpect(o)));
    });
  }

  for (const q of questions) {
    switch (q.type) {
      case 'rs-predict':
      case 'ts-predict': {
        const pick = q.opts[q.answer];
        if (!pick) break;
        if (pick.kind === 'error') add(q.id, q.code, { kind: 'error', code: errorCode(q.error ?? '') });
        else if (pick.kind === 'throws') add(q.id, q.code, { kind: 'throws', thrown: q.thrown ?? '' });
        else add(q.id, q.code, { kind: 'output', output: pick.text.split('\n') });
        break;
      }
      case 'ts-infer': {
        const programLine = programLineOfVisible(q.code, q.line);
        if (programLine === null) {
          problems.push(`${q.id}: line ${q.line} is not a visible line`);
          break;
        }
        q.opts.forEach((type, i) => {
          const code = insertAfterVisibleLine(q.code, q.line, inferAssertion(i, q.name, type))!;
          const expect: Expect = i === q.answer ? { kind: 'compiles' } : { kind: 'error', code: 'TS2322', programLine: programLine + 1 };
          add(`${q.id}/option ${String.fromCharCode(65 + i)}`, code, expect);
        });
        break;
      }
      case 'rs-compiles':
      case 'ts-compiles': {
        const other = q.answer === 'a' ? 'b' : 'a';
        add(`${q.id}/${q.answer}`, q[q.answer], { kind: 'compiles' });
        add(`${q.id}/${other}`, q[other], { kind: 'error', code: errorCode(q.error) });
        break;
      }
      case 'rs-build':
      case 'ts-build':
        add(q.id, fillSlots(q.code, q.answer), q.output ? { kind: 'output', output: q.output } : { kind: 'compiles' });
        break;
      case 'rs-error':
      case 'ts-error':
        add(q.id, q.code, { kind: 'error', code: errorCode(q.error), line: q.answer });
        break;
      case 'rs-fix':
      case 'ts-fix':
        add(q.id, q.code, { kind: 'error', code: errorCode(q.error) });
        q.opts.forEach((o, i) => {
          const where = `${q.id}/option ${String.fromCharCode(65 + i)}`;
          const fixed = applyDiff(q.code, o.diff);
          if (!fixed) problems.push(`${where}: diff does not apply to the code`);
          else add(where, fixed, i === q.answer ? { kind: 'compiles' } : { kind: 'error', code: null });
        });
        break;
      case 'rs-type':
      case 'ts-type':
        q.accept.forEach((value) => add(`${q.id}/${value}`, fillBlank(q.code, value), { kind: 'compiles' }));
        break;
      // *-pairs and every CSS question type have nothing to compile.
      case 'rs-pairs':
      case 'ts-pairs':
      case 'predict':
      case 'pairs':
      case 'versus':
      case 'build':
      case 'tune':
      case 'bug':
      case 'type':
        break;
      default: {
        const exhaustive: never = q;
        throw new Error(`collectSnippets: unhandled question type ${JSON.stringify((exhaustive as { type?: unknown }).type)}`);
      }
    }
  }
  return { snippets, problems };
}

/** Compares a program's stdout against its expected lines; null when they match. Shared by the
 * `output` kind and the (optional) output check after a `throws` kind. */
function outputMismatch(stdout: string, want: readonly string[]): string | null {
  const got = stdout.replace(/\n$/, '');
  const wantJoined = want.join('\n');
  return got === wantJoined ? null : `expected output ${JSON.stringify(wantJoined)}, got ${JSON.stringify(got)}`;
}

/** Why a compile result doesn't match the snippet's expectation, or null when it does.
 * `compiler` names the tool in messages ('rustc' or 'tsc'). Error-kind checks run in this
 * order: compiled, code, visible `line`, `programLine`. */
export function judge(s: Snippet, r: CompileResult, compiler = 'rustc'): string | null {
  const e = s.expect;
  if (e.kind === 'error') {
    if (r.ok) return 'expected a compile error, but it compiled';
    if (e.code && r.errorCode !== e.code) return `expected ${e.code}, ${compiler} reported ${r.errorCode ?? 'no error code'}`;
    if (e.line !== undefined) {
      const shown = r.line === null ? null : visibleLineNumber(s.code, r.line);
      if (shown !== e.line) return `expected the error on line ${e.line}, ${compiler} points at ${shown === null ? 'a hidden line' : `line ${shown}`}`;
    }
    if (e.programLine !== undefined && r.line !== e.programLine) {
      return `expected the error on program line ${e.programLine}, ${compiler} points at ${r.line === null ? 'no line' : `program line ${r.line}`}`;
    }
    return null;
  }
  if (e.kind === 'throws') {
    if (!r.ok) return `expected it to type-check and throw, ${compiler} reported ${r.errorCode ?? 'an error'}`;
    if (r.thrown === undefined) return 'expected it to throw, but it ran to completion';
    if (r.thrown !== e.thrown) return `expected it to throw ${JSON.stringify(e.thrown)}, got ${JSON.stringify(r.thrown)}`;
    return e.output ? outputMismatch(r.stdout, e.output) : null;
  }
  if (!r.ok) return `expected it to compile, ${compiler} reported ${r.errorCode ?? 'an error'}`;
  if (r.runError) return `program failed at runtime: ${r.runError}`;
  if (r.thrown !== undefined) return `program threw: ${r.thrown}`;
  if (e.kind === 'output') return outputMismatch(r.stdout, e.output);
  return null;
}

interface Diagnostic {
  $message_type?: string;
  level?: string;
  code?: { code?: string } | null;
  spans?: { line_start: number; is_primary: boolean }[];
}

/** The first error in rustc's `--error-format=json` stderr: its code and primary (program) line. */
export function firstError(stderr: string): { errorCode: string | null; line: number | null } {
  for (const raw of stderr.split('\n')) {
    if (!raw.startsWith('{')) continue;
    let d: Diagnostic;
    try {
      d = JSON.parse(raw) as Diagnostic;
    } catch {
      continue;
    }
    // Skip warnings and the span-less "aborting due to …" summary.
    if (d.$message_type !== 'diagnostic' || d.level !== 'error' || !d.spans?.length) continue;
    return { errorCode: d.code?.code ?? null, line: d.spans.find((sp) => sp.is_primary)?.line_start ?? null };
  }
  return { errorCode: null, line: null };
}
