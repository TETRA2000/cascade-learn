// CSS answer rules — a port of check() in the prototype.
import type { CssQuestion } from '../../content';
import { sanitizeCssKeyword } from '../../lib/sanitize';
import type { AnswerState } from '../types';

/** Whether Check is enabled (the caller has already ruled out a checked answer). Pairs has no Check. */
export function canCheckCss(q: CssQuestion, a: AnswerState): boolean {
  switch (q.type) {
    case 'predict':
    case 'versus':
    case 'bug':
      return a.sel !== null;
    case 'build':
      return a.slots.every((s) => s !== null);
    case 'tune':
      return true;
    case 'type':
      return a.val.trim().length > 0;
    case 'pairs':
      return false;
  }
}

export function isCorrectCss(q: CssQuestion, a: AnswerState): boolean {
  switch (q.type) {
    case 'predict':
    case 'versus':
    case 'bug':
      return a.sel === q.answer;
    case 'build':
      return a.slots.every((ci, i) => ci !== null && q.bank[ci] === q.answer[i]);
    case 'tune':
      return a.num === q.target;
    case 'type':
      return q.accept.includes(sanitizeCssKeyword(a.val));
    case 'pairs':
      return q.items.every((it) => a.matched[it.id]);
  }
}
