// TypeScript questions for pure unit tests (validation, grading, feedback, the checker) and
// component-level renderer tests. Each program is real: the TS checker runs them as written.
import type { TsCompilesQuestion, TsInferQuestion, TsPredictQuestion } from '../content';

const predictOpts: TsPredictQuestion['opts'] = [
  { text: '5', kind: 'output' },
  { text: '"5"', kind: 'output' },
  { text: 'Type error', kind: 'error' },
  { text: 'Throws at runtime', kind: 'throws' },
];

export const tsPredict: TsPredictQuestion = {
  id: 'ts-predict-1',
  type: 'ts-predict',
  prompt: 'What does this program print?',
  code: ['const n = 2 + 3;', 'console.log(n);'],
  opts: predictOpts,
  answer: 0,
  explain: '`2 + 3` is the number `5`.',
};

export const tsPredictError: TsPredictQuestion = {
  id: 'ts-predict-2',
  type: 'ts-predict',
  prompt: 'What does this program print?',
  code: ['const n: number = "5";', 'console.log(n);'],
  opts: predictOpts,
  answer: 2,
  error: "error TS2322: Type 'string' is not assignable to type 'number'.",
  explain: '`"5"` is a string, not a `number`.',
};

export const tsPredictThrows: TsPredictQuestion = {
  id: 'ts-predict-3',
  type: 'ts-predict',
  prompt: 'What does this program print?',
  code: ['const words: string[] = [];', 'console.log(words[0].toUpperCase());'],
  opts: predictOpts,
  answer: 3,
  thrown: "TypeError: Cannot read properties of undefined (reading 'toUpperCase')",
  explain: '`words[0]` is typed `string`, but the array is empty, so it is `undefined` at runtime.',
};

export const tsInfer: TsInferQuestion = {
  id: 'ts-infer-1',
  type: 'ts-infer',
  prompt: 'What type does the editor show for `x` on line 3?',
  code: ['function show(x: string | number) {', '  if (typeof x === "string") {', '    console.log(x.length);', '  }', '}'],
  line: 3,
  name: 'x',
  opts: ['string', 'string | number', 'number', 'never'],
  answer: 0,
  explain: 'Inside `if (typeof x === "string")`, `x` is narrowed to `string`.',
};

export const tsCompiles: TsCompilesQuestion = {
  id: 'ts-compiles-1',
  type: 'ts-compiles',
  prompt: 'Which one type-checks?',
  a: ['const n: number = "5";', 'console.log(n);'],
  b: ['const n: number = 5;', 'console.log(n);'],
  answer: 'b',
  error: "error TS2322: Type 'string' is not assignable to type 'number'.",
  explain: 'A assigns a string to a `number`.',
};
