// Rust answer rules.
import type { RustQuestion } from '../../content';
import { normalizeToken } from '../../lib/rustCode';
import type { AnswerState } from '../types';

/** Whether Check is enabled (the caller has already ruled out a checked answer). rs-pairs has no Check. */
export function canCheckRust(q: RustQuestion, a: AnswerState): boolean {
  switch (q.type) {
    case 'rs-predict':
    case 'rs-compiles':
    case 'rs-error':
    case 'rs-fix':
      return a.sel !== null;
    case 'rs-build':
      return a.slots.every((s) => s !== null);
    case 'rs-type':
      return normalizeToken(a.val).length > 0;
    case 'rs-pairs':
      return false;
  }
}

export function isCorrectRust(q: RustQuestion, a: AnswerState): boolean {
  switch (q.type) {
    case 'rs-predict':
    case 'rs-compiles':
    case 'rs-error':
    case 'rs-fix':
      return a.sel === q.answer;
    case 'rs-build':
      return a.slots.every((ci, i) => ci !== null && q.bank[ci] === q.answer[i]);
    case 'rs-type':
      return q.accept.includes(normalizeToken(a.val));
    case 'rs-pairs':
      return q.items.every((it) => a.matched[it.id]);
  }
}
