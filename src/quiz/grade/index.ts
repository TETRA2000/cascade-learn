// Answer rules — a port of freshQ() and check() in the prototype, split by course family.
import type { Question } from '../../content';
import type { AnswerState } from '../types';
import { canCheckCss, isCorrectCss } from './css';

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
  return canCheckCss(q, a);
}

export function isCorrect(q: Question, a: AnswerState): boolean {
  return isCorrectCss(q, a);
}
