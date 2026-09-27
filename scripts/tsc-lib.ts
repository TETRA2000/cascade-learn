// Pure logic for check-ts.ts: the fixed files a compile workspace needs, how a snippet becomes a
// module, and how to read tsc's and the run harness's output. The checker script does the I/O.
import { programSource } from '../src/lib/code.ts';

/** The only global a TS snippet may reference: `console.log`/`console.error`. */
export const TS_GLOBALS = 'declare const console: { log(...args: unknown[]): void; error(...args: unknown[]): void };';

/** `__Eq<A, B>` is `true` iff `A` and `B` are exactly the same type (mutually assignable both
 * ways), so a `ts-infer` distractor's inserted assertion fails with `TS2322` on a mismatch. */
export const EQ_TYPE = 'type __Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;';

/** The workspace's tsconfig.json, per Global Constraints plus the checker's own settings. */
export const TSCONFIG = {
  compilerOptions: {
    strict: true,
    target: 'es2023',
    lib: ['es2023'],
    types: [],
    module: 'nodenext',
    noEmitOnError: false,
    pretty: false,
    outDir: 'out',
    skipLibCheck: true,
  },
  include: ['*.mts', '*.d.ts'],
};

/** Imports the compiled module and reports a thrown error the way check-ts.ts expects: on
 * stderr as `THROWN <String(error)>`, with exit code 3. Stdout from the module is left alone. */
export const HARNESS = `import { pathToFileURL } from 'node:url';

const file = process.argv[2];
try {
  await import(pathToFileURL(file).href);
} catch (e) {
  process.stderr.write(\`THROWN \${String(e)}\\n\`);
  process.exit(3);
}
`;

/** The program tsc compiles: hidden lines un-hidden, wrapped as its own module so snippets never
 * share scope (an unexported top-level \`const\` in one file would otherwise collide with another's). */
export function tsModuleSource(code: readonly string[]): string {
  return programSource(code) + 'export {};\n';
}

/** The temp-workspace file name for snippet `n`. */
export function snippetFile(n: number): string {
  return `s${n}.mts`;
}

/** The first error per snippet, from tsc's `pretty: false` stdout (`sN.mts(line,col): error TSxxxx: msg`).
 * Diagnostics against `globals.d.ts`/`eq.d.ts` (or anything not `sN.mts`) are ignored. */
export function parseTscOutput(stdout: string): Map<number, { errorCode: string; line: number }> {
  const result = new Map<number, { errorCode: string; line: number }>();
  const re = /^s(\d+)\.mts\((\d+),\d+\): error (TS\d+):/;
  for (const raw of stdout.split('\n')) {
    const m = re.exec(raw);
    if (!m) continue;
    const n = Number(m[1]);
    if (result.has(n)) continue;
    result.set(n, { errorCode: m[3]!, line: Number(m[2]) });
  }
  return result;
}

/** The message after the run harness's `THROWN ` line, or null when the run didn't throw. */
export function parseThrown(stderr: string): string | null {
  for (const line of stderr.split('\n')) {
    if (line.startsWith('THROWN ')) return line.slice('THROWN '.length);
  }
  return null;
}
