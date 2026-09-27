import { describe, expect, it } from 'vitest';
import { EQ_TYPE, HARNESS, TSCONFIG, TS_GLOBALS, parseThrown, parseTscOutput, snippetFile, tsModuleSource } from './tsc-lib.ts';

describe('tsModuleSource', () => {
  it('makes every snippet a module so snippets never share scope', () => {
    expect(tsModuleSource(['# const x = 1;', 'console.log(x);'])).toBe('const x = 1;\nconsole.log(x);\nexport {};\n'); // Review Focus
  });
});

describe('snippetFile', () => {
  it('names a snippet file by index', () => {
    expect(snippetFile(0)).toBe('s0.mts');
    expect(snippetFile(12)).toBe('s12.mts');
  });
});

describe('parseTscOutput', () => {
  it('keeps the first error per snippet', () => {
    const out = [
      "s0.mts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.",
      "s0.mts(2,1): error TS2304: Cannot find name 'y'.",
      's12.mts(4,11): error TS2322: Type \'true\' is not assignable to type \'false\'.',
      'globals.d.ts(1,1): error TS1234: ignored',
    ].join('\n');
    expect(parseTscOutput(out)).toEqual(
      new Map([
        [0, { errorCode: 'TS2322', line: 1 }],
        [12, { errorCode: 'TS2322', line: 4 }],
      ]),
    );
  });

  it('copes with no diagnostics', () => {
    expect(parseTscOutput('')).toEqual(new Map());
  });
});

describe('parseThrown', () => {
  it('reads the harness THROWN line', () => {
    expect(parseThrown("warning\nTHROWN TypeError: Cannot read properties of undefined (reading 'toUpperCase')\n")).toBe(
      "TypeError: Cannot read properties of undefined (reading 'toUpperCase')",
    );
    expect(parseThrown('')).toBeNull();
  });
});

describe('the fixed file contents', () => {
  it('declares only console, with log and error', () => {
    expect(TS_GLOBALS).toBe('declare const console: { log(...args: unknown[]): void; error(...args: unknown[]): void };');
  });

  it('declares __Eq for ts-infer assertions', () => {
    expect(EQ_TYPE).toBe('type __Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;');
  });

  it('sets the Global Constraints compiler settings, plus outDir, skipLibCheck and include', () => {
    expect(TSCONFIG).toEqual({
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
    });
  });

  it('runs the compiled module and reports a thrown error via stderr', () => {
    expect(HARNESS).toContain('pathToFileURL');
    expect(HARNESS).toContain('THROWN');
    expect(HARNESS).toContain('process.exit(3)');
  });
});
