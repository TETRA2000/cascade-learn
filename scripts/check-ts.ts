// `npm run check:ts [-- dir]`: type-check every TypeScript snippet in content/ts (or `dir`) with
// the pinned compiler, run the ones that type-check, and compare with their authored output,
// error or throw.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Question, Unit } from '../src/content/types';
import { collectSnippets, judge, type CompileResult, type Snippet } from './code-check-lib.ts';
import { EQ_TYPE, HARNESS, TSCONFIG, TS_GLOBALS, parseThrown, parseTscOutput, snippetFile, tsModuleSource } from './tsc-lib.ts';

const repoRoot = resolve(import.meta.dirname, '..');
const dir = resolve(process.argv[2] ?? join(repoRoot, 'content/ts'));
const read = <T>(file: string): T => JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;

let units: Unit[];
let questions: Question[];
try {
  units = read<Unit[]>('lessons.json');
  questions = read<Question[]>('questions.json');
} catch (e) {
  console.error(`check:ts needs content at ${dir} (lessons.json and questions.json): ${(e as Error).message}`);
  process.exit(1);
}

const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
const version = spawnSync(tscBin, ['--version'], { encoding: 'utf8' });
if (version.error || version.status !== 0) {
  console.error('check:ts needs typescript installed (run npm install; the version is pinned in package.json).');
  process.exit(1);
}
console.log(version.stdout.trim());

function runSnippet(n: number, work: string, errors: Map<number, { errorCode: string; line: number }>): CompileResult {
  const err = errors.get(n);
  if (err) return { ok: false, errorCode: err.errorCode, line: err.line };

  const out = join(work, 'out', snippetFile(n).replace(/\.mts$/, '.mjs'));
  const run = spawnSync(process.execPath, [join(work, 'harness.mjs'), out], { encoding: 'utf8', timeout: 5000 });
  if (run.status === 3) return { ok: true, stdout: run.stdout ?? '', thrown: parseThrown(run.stderr ?? '') ?? 'unknown error' };

  const timedOut = (run.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT' || run.signal === 'SIGTERM';
  const runError = timedOut ? 'timed out after 5s' : run.signal ? `killed by ${run.signal}` : run.status !== 0 ? `exited with code ${run.status}` : undefined;
  return runError === undefined ? { ok: true, stdout: run.stdout ?? '' } : { ok: true, stdout: run.stdout ?? '', runError };
}

const { snippets, problems } = collectSnippets(units, questions);
const failures = [...problems];
const work = mkdtempSync(join(tmpdir(), 'check-ts-'));
try {
  snippets.forEach((s: Snippet, i) => writeFileSync(join(work, snippetFile(i)), tsModuleSource(s.code)));
  writeFileSync(join(work, 'globals.d.ts'), TS_GLOBALS);
  writeFileSync(join(work, 'eq.d.ts'), EQ_TYPE);
  writeFileSync(join(work, 'harness.mjs'), HARNESS);
  writeFileSync(join(work, 'tsconfig.json'), JSON.stringify(TSCONFIG, null, 2));

  // cwd is the workspace itself, so tsc prints bare `sN.mts` filenames (relative to cwd), not a
  // path relative to the repo root; parseTscOutput depends on that bare form.
  const tsc = spawnSync(tscBin, ['-p', work], { encoding: 'utf8', cwd: work, timeout: 120_000 });
  if (tsc.error) {
    console.error(`check:ts: tsc failed to run: ${tsc.error.message}`);
    process.exit(1);
  }
  const errors = parseTscOutput(tsc.stdout ?? '');

  snippets.forEach((s, i) => {
    const why = judge(s, runSnippet(i, work, errors), 'tsc');
    if (why) failures.push(`${s.where}: ${why}`);
  });
} finally {
  rmSync(work, { recursive: true, force: true });
}

for (const f of failures) console.error(`✗ ${f}`);
console.log(`${snippets.length} snippets checked, ${failures.length} failed`);
process.exitCode = failures.length ? 1 : 0;
