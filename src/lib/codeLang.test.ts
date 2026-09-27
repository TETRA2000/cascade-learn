import { expect, it } from 'vitest';
import { courseLang, LANG, langOfKey } from './codeLang';

it('profiles each language', () => {
  expect(LANG.rust).toMatchObject({ codeLabel: 'Rust code', compiler: 'rustc', errorTitle: 'Doesn’t compile' });
  expect(LANG.ts).toMatchObject({ codeLabel: 'TypeScript code', compiler: 'tsc', errorTitle: 'Type error' });
  expect(LANG.ts.errorPattern.test("error TS2322: Type 'string' is not assignable to type 'number'.")).toBe(true);
  expect(LANG.rust.errorPattern.test('error TS2322: x')).toBe(false);
  expect(langOfKey('ts-infer')).toBe('ts');
  expect(langOfKey('rs-fix')).toBe('rust');
  expect(courseLang('css')).toBeNull();
});
