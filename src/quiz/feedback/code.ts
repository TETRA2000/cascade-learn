// Code-course feedback copy (Rust, TypeScript). `compiler` carries the compiler's message whenever
// the question is about a compile error.
import type { CodeQuestion } from '../../content';
import type { AnswerState } from '../types';
import { optionLetter, pairsSummary, type FeedbackText } from './shared';

export function codeFeedback(q: CodeQuestion, a: AnswerState, praise: string): FeedbackText {
  let title = a.ok ? praise : 'Not quite';
  if (q.type === 'rs-pairs') title = 'All pairs matched!';
  if (!a.ok && q.type === 'rs-error') title = `Not that one — it’s line ${q.answer}`;

  const detail = q.type === 'rs-pairs' ? pairsSummary(a.misses) : a.ok ? null : answerLine(q);
  const compiler = compilerMessage(q);
  return compiler ? { title, detail, compiler } : { title, detail };
}

function answerLine(q: CodeQuestion): string | null {
  switch (q.type) {
    case 'rs-predict':
    case 'rs-fix':
      return `Answer: ${optionLetter(q.answer)}`;
    case 'rs-compiles':
      return `Answer: ${q.answer.toUpperCase()}`;
    case 'rs-build':
      return `Answer: ${q.answer.join(', ')}`;
    case 'rs-type':
      return `Answer: ${q.accept[0]}`;
    case 'rs-error':
    case 'rs-pairs':
      return null;
  }
}

function compilerMessage(q: CodeQuestion): string | undefined {
  switch (q.type) {
    case 'rs-compiles':
    case 'rs-error':
    case 'rs-fix':
      return q.error;
    case 'rs-predict':
      return q.opts[q.answer]?.kind === 'error' ? q.error : undefined;
    case 'rs-pairs':
    case 'rs-build':
    case 'rs-type':
      return undefined;
  }
}
