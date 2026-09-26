// One quiz run — a pure port of start/grade/check/next/resolvePair in the prototype.
import { courseById, questionById, type CourseId, type LessonKey, type PairsQuestion, type Question } from '../content';
import { HEARTS_PER_LESSON, XP_FIRST_TRY, XP_RETRY } from '../state/rules';
import { canCheck, freshAnswer, isCorrect } from './grade';
import type { AnswerState, Session } from './types';

const lookup = (courseId: CourseId, id: string) => questionById(courseById(courseId), id);

export type SessionAction =
  | { type: 'start'; lessonKey: LessonKey; ids: readonly string[] }
  | { type: 'select'; sel: number | string }
  | { type: 'placeWord'; bankIndex: number }
  | { type: 'clearSlot'; slot: number }
  | { type: 'step'; dir: 1 | -1 }
  | { type: 'input'; val: string }
  | { type: 'pickPair'; side: 'left' | 'right'; id: string }
  | { type: 'clearMiss' }
  | { type: 'check' }
  | { type: 'next' };

export function startSession(courseId: CourseId, lessonKey: LessonKey, ids: readonly string[], hearts = HEARTS_PER_LESSON): Session {
  const queue = ids.filter((id) => lookup(courseId, id));
  return {
    courseId,
    lessonKey,
    queue,
    idx: 0,
    total: queue.length,
    hearts,
    solved: 0,
    firstTry: 0,
    xp: 0,
    missed: {},
    answer: freshAnswer(queue[0] === undefined ? undefined : lookup(courseId, queue[0])),
    phase: queue.length ? 'question' : 'done',
  };
}

export function currentQuestion(s: Session): Question | undefined {
  const id = s.queue[s.idx];
  return id === undefined ? undefined : lookup(s.courseId, id);
}

/** First-try percentage for the results screen. */
export function accuracy(s: Session): number {
  return s.total ? Math.round((s.firstTry / s.total) * 100) : 0;
}

function withAnswer(s: Session, patch: Partial<AnswerState>): Session {
  return { ...s, answer: { ...s.answer, ...patch } };
}

function grade(s: Session, q: Question, ok: boolean, patch: Partial<AnswerState> = {}): Session {
  const graded = withAnswer(s, { ...patch, checked: true, ok });
  if (ok) {
    const first = !s.missed[q.id];
    return {
      ...graded,
      solved: s.solved + 1,
      firstTry: s.firstTry + (first ? 1 : 0),
      xp: s.xp + (first ? XP_FIRST_TRY : XP_RETRY),
    };
  }
  return { ...graded, hearts: Math.max(0, s.hearts - 1), missed: { ...s.missed, [q.id]: true }, queue: [...s.queue, q.id] };
}

function resolvePair(s: Session, q: PairsQuestion, left: string, right: string): Session {
  if (left === right) {
    const matched = { ...s.answer.matched, [left]: true as const };
    const patch = { matched, left: null, right: null, miss: null };
    return q.items.every((it) => matched[it.id]) ? grade(s, q, true, patch) : withAnswer(s, patch);
  }
  return withAnswer(s, { miss: { left, right }, left: null, right: null, misses: s.answer.misses + 1 });
}

export function sessionReducer(s: Session, action: SessionAction): Session {
  if (action.type === 'start') return startSession(s.courseId, action.lessonKey, action.ids);

  const q = currentQuestion(s);
  const a = s.answer;
  if (s.phase !== 'question' || !q) return s;

  switch (action.type) {
    case 'select':
      return a.checked ? s : withAnswer(s, { sel: action.sel });

    case 'placeWord': {
      if (q.type !== 'build' || a.checked || a.slots.includes(action.bankIndex)) return s;
      const at = a.slots.indexOf(null);
      if (at === -1) return s;
      const slots = [...a.slots];
      slots[at] = action.bankIndex;
      return withAnswer(s, { slots });
    }

    case 'clearSlot': {
      if (a.checked || a.slots[action.slot] == null) return s;
      const slots = [...a.slots];
      slots[action.slot] = null;
      return withAnswer(s, { slots });
    }

    case 'step': {
      if (q.type !== 'tune' || a.checked) return s;
      return withAnswer(s, { num: Math.min(q.max, Math.max(q.min, a.num + action.dir * q.step)) });
    }

    case 'input':
      return a.checked ? s : withAnswer(s, { val: action.val });

    case 'pickPair': {
      if (q.type !== 'pairs' || a.checked || a.matched[action.id]) return s;
      if (action.side === 'left') {
        return a.right ? resolvePair(s, q, action.id, a.right) : withAnswer(s, { left: action.id, miss: null });
      }
      return a.left ? resolvePair(s, q, a.left, action.id) : withAnswer(s, { right: action.id, miss: null });
    }

    case 'clearMiss':
      return a.miss ? withAnswer(s, { miss: null }) : s;

    case 'check':
      return canCheck(q, a) ? grade(s, q, isCorrect(q, a)) : s;

    case 'next': {
      if (!a.checked) return s;
      if (s.hearts <= 0) return { ...s, phase: 'out' };
      const idx = s.idx + 1;
      const id = s.queue[idx];
      if (id === undefined) return { ...s, phase: 'done' };
      return { ...s, idx, answer: freshAnswer(lookup(s.courseId, id)) };
    }
  }
}
