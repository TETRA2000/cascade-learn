// Code-course answer rules (Rust, TypeScript).
import type { CodeQuestion } from '../../content';
import { normalizeToken } from '../../lib/code';
import type { AnswerState } from '../types';

/** Whether Check is enabled (the caller has already ruled out a checked answer). *-pairs has no Check. */
export function canCheckCode(q: CodeQuestion, a: AnswerState): boolean {
  switch (q.type) {
    case 'rs-predict':
    case 'ts-predict':
    case 'ts-infer':
    case 'rs-compiles':
    case 'ts-compiles':
    case 'rs-error':
    case 'ts-error':
    case 'rs-fix':
    case 'ts-fix':
      return a.sel !== null;
    case 'rs-build':
    case 'ts-build':
      return a.slots.every((s) => s !== null);
    case 'rs-type':
    case 'ts-type':
      return normalizeToken(a.val).length > 0;
    case 'rs-pairs':
    case 'ts-pairs':
      return false;
  }
}

export function isCorrectCode(q: CodeQuestion, a: AnswerState): boolean {
  switch (q.type) {
    case 'rs-predict':
    case 'ts-predict':
    case 'ts-infer':
    case 'rs-compiles':
    case 'ts-compiles':
    case 'rs-error':
    case 'ts-error':
    case 'rs-fix':
    case 'ts-fix':
      return a.sel === q.answer;
    case 'rs-build':
    case 'ts-build':
      return a.slots.every((ci, i) => ci !== null && q.bank[ci] === q.answer[i]);
    case 'rs-type':
    case 'ts-type':
      return q.accept.includes(normalizeToken(a.val));
    case 'rs-pairs':
    case 'ts-pairs':
      return q.items.every((it) => a.matched[it.id]);
  }
}
