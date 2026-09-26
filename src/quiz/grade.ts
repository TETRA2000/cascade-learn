// Per-type answer rules — a port of freshQ() and check() in the prototype.
import type { Question } from '../content';
import { sanitizeCssKeyword } from '../lib/sanitize';
import type { AnswerState } from './types';

export function freshAnswer(q: Question | undefined): AnswerState {
  return {
    sel: null,
    slots: q?.type === 'build' ? q.answer.map(() => null) : [],
    num: q?.type === 'tune' ? q.start : 0,
    val: '',
    left: null,
    right: null,
    matched: {},
    miss: null,
    misses: 0,
    checked: false,
    ok: false,
  };
}

/** Whether the Check button is enabled. Pairs has no Check: it completes itself. */
export function canCheck(q: Question, a: AnswerState): boolean {
  if (a.checked) return false;
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

export function isCorrect(q: Question, a: AnswerState): boolean {
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
