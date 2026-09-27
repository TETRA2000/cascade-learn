// Rust feedback copy. `compiler` carries rustc's message whenever the question is about a compile error.
import type { RustQuestion } from '../../content';
import type { AnswerState } from '../types';
import { optionLetter, pairsSummary, type FeedbackText } from './shared';

export function rustFeedback(q: RustQuestion, a: AnswerState, praise: string): FeedbackText {
  let title = a.ok ? praise : 'Not quite';
  if (q.type === 'rs-pairs') title = 'All pairs matched!';
  if (!a.ok && q.type === 'rs-error') title = `Not that one — it’s line ${q.answer}`;

  const detail = q.type === 'rs-pairs' ? pairsSummary(a.misses) : a.ok ? null : answerLine(q);
  const compiler = compilerMessage(q);
  return compiler ? { title, detail, compiler } : { title, detail };
}

function answerLine(q: RustQuestion): string | null {
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

function compilerMessage(q: RustQuestion): string | undefined {
  switch (q.type) {
    case 'rs-compiles':
    case 'rs-error':
    case 'rs-fix':
      return q.error;
    case 'rs-predict':
      return q.opts[q.answer]?.kind === 'error' ? q.error : undefined;
    default:
      return undefined;
  }
}
