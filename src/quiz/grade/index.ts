// Answer rules — a port of freshQ() and check() in the prototype, split by course family.
import { isBuild, isCodeQuestion, type Question } from '../../content';
import type { AnswerState } from '../types';
import { canCheckCode, isCorrectCode } from './code';
import { canCheckCss, isCorrectCss } from './css';

export function freshAnswer(q: Question | undefined): AnswerState {
  return {
    sel: null,
    slots: q && isBuild(q) ? q.answer.map(() => null) : [],
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
  return isCodeQuestion(q) ? canCheckCode(q, a) : canCheckCss(q, a);
}

export function isCorrect(q: Question, a: AnswerState): boolean {
  return isCodeQuestion(q) ? isCorrectCode(q, a) : isCorrectCss(q, a);
}
