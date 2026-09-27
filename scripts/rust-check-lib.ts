// Pure logic for `npm run check:rust`: which Rust snippets to compile, what
// each must do, and how to read rustc's JSON diagnostics. check-rust.ts does the I/O.
import type { Question, Unit } from '../src/content/types';
import { applyDiff, fillBlank, fillSlots, visibleLineNumber } from '../src/lib/rustCode.ts';

export type Expect =
  | { kind: 'compiles' }
  | { kind: 'output'; output: string[] }
  /** `code` null = any error. `line` is a 1-based visible line. */
  | { kind: 'error'; code: string | null; line?: number };

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
    }
  | { ok: false; errorCode: string | null; line: number | null };

/** `error[E0382]: …` → `E0382`. */
export function errorCode(message: string): string | null {
  return /^error\[(E\d{4})\]/.exec(message)?.[1] ?? null;
}

function resultExpect(r: { output?: string[]; error?: string }): Expect {
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
      if (demo?.kind === 'rs-choice') demo.opts.forEach((o) => add(`${where}/${o.label}`, o.code, resultExpect(o)));
    });
  }

  for (const q of questions) {
    switch (q.type) {
      case 'rs-predict': {
        const pick = q.opts[q.answer];
        if (!pick) break;
        add(q.id, q.code, pick.kind === 'error' ? { kind: 'error', code: errorCode(q.error ?? '') } : { kind: 'output', output: pick.text.split('\n') });
        break;
      }
      case 'rs-compiles': {
        const other = q.answer === 'a' ? 'b' : 'a';
        add(`${q.id}/${q.answer}`, q[q.answer], { kind: 'compiles' });
        add(`${q.id}/${other}`, q[other], { kind: 'error', code: errorCode(q.error) });
        break;
      }
      case 'rs-build':
        add(q.id, fillSlots(q.code, q.answer), q.output ? { kind: 'output', output: q.output } : { kind: 'compiles' });
        break;
      case 'rs-error':
        add(q.id, q.code, { kind: 'error', code: errorCode(q.error), line: q.answer });
        break;
      case 'rs-fix':
        add(q.id, q.code, { kind: 'error', code: errorCode(q.error) });
        q.opts.forEach((o, i) => {
          const where = `${q.id}/option ${String.fromCharCode(65 + i)}`;
          const fixed = applyDiff(q.code, o.diff);
          if (!fixed) problems.push(`${where}: diff does not apply to the code`);
          else add(where, fixed, i === q.answer ? { kind: 'compiles' } : { kind: 'error', code: null });
        });
        break;
      case 'rs-type':
        q.accept.forEach((value) => add(`${q.id}/${value}`, fillBlank(q.code, value), { kind: 'compiles' }));
        break;
      // rs-pairs and every CSS question type have nothing to compile.
      case 'rs-pairs':
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

/** Why a compile result doesn't match the snippet's expectation, or null when it does. */
export function judge(s: Snippet, r: CompileResult): string | null {
  const e = s.expect;
  if (e.kind === 'error') {
    if (r.ok) return 'expected a compile error, but it compiled';
    if (e.code && r.errorCode !== e.code) return `expected ${e.code}, rustc reported ${r.errorCode ?? 'no error code'}`;
    if (e.line !== undefined) {
      const shown = r.line === null ? null : visibleLineNumber(s.code, r.line);
      if (shown !== e.line) return `expected the error on line ${e.line}, rustc points at ${shown === null ? 'a hidden line' : `line ${shown}`}`;
    }
    return null;
  }
  if (!r.ok) return `expected it to compile, rustc reported ${r.errorCode ?? 'an error'}`;
  if (r.runError) return `program failed at runtime: ${r.runError}`;
  if (e.kind === 'output') {
    const got = r.stdout.replace(/\n$/, '');
    const want = e.output.join('\n');
    if (got !== want) return `expected output ${JSON.stringify(want)}, got ${JSON.stringify(got)}`;
  }
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
