// Code-course feedback copy (Rust, TypeScript). `compiler` carries the compiler's message whenever
// the question is about a compile error; `runtime` carries Node's when a TS program throws.
import type { CodeQuestion } from '../../content';
import type { AnswerState } from '../types';
import { optionLetter, pairsSummary, type FeedbackText } from './shared';

export function codeFeedback(q: CodeQuestion, a: AnswerState, praise: string): FeedbackText {
  const pairs = q.type === 'rs-pairs' || q.type === 'ts-pairs';
  let title = a.ok ? praise : 'Not quite';
  if (pairs) title = 'All pairs matched!';
  if (!a.ok && (q.type === 'rs-error' || q.type === 'ts-error')) title = `Not that one — it’s line ${q.answer}`;

  const detail = pairs ? pairsSummary(a.misses) : a.ok ? null : answerLine(q);
  const compiler = compilerMessage(q);
  const runtime = runtimeMessage(q);
  return { title, detail, ...(compiler && { compiler }), ...(runtime && { runtime }) };
}

function answerLine(q: CodeQuestion): string | null {
  switch (q.type) {
    case 'rs-predict':
    case 'ts-predict':
    case 'ts-infer':
    case 'rs-fix':
    case 'ts-fix':
      return `Answer: ${optionLetter(q.answer)}`;
    case 'rs-compiles':
    case 'ts-compiles':
      return `Answer: ${q.answer.toUpperCase()}`;
    case 'rs-build':
    case 'ts-build':
      return `Answer: ${q.answer.join(', ')}`;
    case 'rs-type':
    case 'ts-type':
      return `Answer: ${q.accept[0]}`;
    case 'rs-error':
    case 'ts-error':
    case 'rs-pairs':
    case 'ts-pairs':
      return null;
  }
}

function compilerMessage(q: CodeQuestion): string | undefined {
  switch (q.type) {
    case 'rs-compiles':
    case 'ts-compiles':
    case 'rs-error':
    case 'ts-error':
    case 'rs-fix':
    case 'ts-fix':
      return q.error;
    case 'rs-predict':
    case 'ts-predict':
      return q.opts[q.answer]?.kind === 'error' ? q.error : undefined;
    case 'rs-pairs':
    case 'ts-pairs':
    case 'ts-infer':
    case 'rs-build':
    case 'ts-build':
    case 'rs-type':
    case 'ts-type':
      return undefined;
  }
}

/** Node's message when a ts-predict answer is that the program throws. */
function runtimeMessage(q: CodeQuestion): string | undefined {
  return q.type === 'ts-predict' && q.opts[q.answer]?.kind === 'throws' ? q.thrown : undefined;
}
