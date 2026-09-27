// `npm run check:rust [-- dir]`: compile every Rust snippet in content/rust (or `dir`)
// with the pinned toolchain, run it, and compare with its authored output or error.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Question, Unit } from '../src/content/types';
import { programSource } from '../src/lib/rustCode.ts';
import { collectSnippets, firstError, judge, type CompileResult, type Snippet } from './rust-check-lib.ts';

const dir = resolve(process.argv[2] ?? join(import.meta.dirname, '../content/rust'));
const read = <T>(file: string): T => JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;

function compile(s: Snippet, work: string, n: number): CompileResult {
  const src = join(work, `snippet${n}.rs`);
  const bin = join(work, `snippet${n}`);
  writeFileSync(src, programSource(s.code));
  const rustc = spawnSync('rustc', ['--edition', '2024', '--error-format=json', '-A', 'warnings', '-o', bin, src], {
    encoding: 'utf8',
    timeout: 60_000,
  });
  if (rustc.error && (rustc.error as NodeJS.ErrnoException).code !== 'ETIMEDOUT') throw rustc.error;
  if (rustc.signal || rustc.error) return { ok: false, errorCode: null, line: null };
  if (rustc.status !== 0) return { ok: false, ...firstError(rustc.stderr) };

  const run = spawnSync(bin, { encoding: 'utf8', timeout: 5000 });
  const timedOut = (run.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT' || run.signal === 'SIGTERM';
  const runError = timedOut ? 'timed out after 5s' : run.signal ? `killed by ${run.signal}` : run.status !== 0 ? `exited with code ${run.status}` : undefined;
  return runError === undefined ? { ok: true, stdout: run.stdout ?? '' } : { ok: true, stdout: run.stdout ?? '', runError };
}

const version = spawnSync('rustc', ['--version'], { encoding: 'utf8' });
if (version.error || version.status !== 0) {
  console.error('check:rust needs rustc on PATH (the version is pinned in rust-toolchain.toml).');
  process.exit(1);
}
console.log(version.stdout.trim());

const { snippets, problems } = collectSnippets(read<Unit[]>('lessons.json'), read<Question[]>('questions.json'));
const failures = [...problems];
const work = mkdtempSync(join(tmpdir(), 'check-rust-'));
try {
  snippets.forEach((s, i) => {
    const why = judge(s, compile(s, work, i));
    if (why) failures.push(`${s.where}: ${why}`);
  });
} finally {
  rmSync(work, { recursive: true, force: true });
}

for (const f of failures) console.error(`✗ ${f}`);
console.log(`${snippets.length} snippets checked, ${failures.length} failed`);
process.exitCode = failures.length ? 1 : 0;
