import { describe, expect, it } from 'vitest';
import { accuracy, currentQuestion, sessionReducer, startSession, type SessionAction } from './session';
import type { Session } from './types';

const run = (s: Session, ...actions: SessionAction[]) => actions.reduce(sessionReducer, s);
const bugs = () => startSession('css', 'bug', ['bug-1', 'bug-2', 'bug-3']); // answers: lines 4, 3, 3
const pickLine = (line: number): SessionAction[] => [{ type: 'select', sel: line }, { type: 'check' }];
const next: SessionAction = { type: 'next' };

describe('startSession', () => {
  it('starts with full hearts on the first question', () => {
    const s = bugs();
    expect(s).toMatchObject({ idx: 0, total: 3, hearts: 5, xp: 0, solved: 0, phase: 'question' });
    expect(currentQuestion(s)?.id).toBe('bug-1');
  });

  it('drops unknown ids and finishes immediately when nothing is left', () => {
    expect(startSession('css', 'bug', ['nope', 'bug-2']).queue).toEqual(['bug-2']);
    expect(startSession('css', 'bug', []).phase).toBe('done');
  });
});

describe('grading', () => {
  it('awards 10 XP for a first-try answer', () => {
    const s = run(bugs(), ...pickLine(4));
    expect(s).toMatchObject({ solved: 1, firstTry: 1, xp: 10, hearts: 5 });
    expect(s.answer).toMatchObject({ checked: true, ok: true });
  });

  it('costs a heart and re-queues a wrong answer', () => {
    const s = run(bugs(), ...pickLine(1));
    expect(s).toMatchObject({ hearts: 4, solved: 0, xp: 0 });
    expect(s.queue).toEqual(['bug-1', 'bug-2', 'bug-3', 'bug-1']);
    expect(s.missed).toEqual({ 'bug-1': true });
  });

  it('awards 5 XP when a missed question comes back and is answered', () => {
    const s = run(bugs(), ...pickLine(1), next, ...pickLine(3), next, ...pickLine(3), next, ...pickLine(4));
    expect(s).toMatchObject({ solved: 3, firstTry: 2, xp: 25, hearts: 4 });
    expect(accuracy(s)).toBe(67);
  });

  it('ignores a second Check on the same question', () => {
    const s = run(bugs(), ...pickLine(1), { type: 'check' }, { type: 'select', sel: 4 }, { type: 'check' });
    expect(s.hearts).toBe(4);
    expect(s.queue).toHaveLength(4);
    expect(s.answer.sel).toBe(1);
  });

  it('ignores Check when the answer is incomplete', () => {
    expect(run(bugs(), { type: 'check' }).answer.checked).toBe(false);
  });
});

describe('next', () => {
  it('does nothing before the answer is checked', () => {
    expect(run(bugs(), next).idx).toBe(0);
  });

  it('moves on with a fresh answer', () => {
    const s = run(bugs(), ...pickLine(4), next);
    expect(s.idx).toBe(1);
    expect(s.answer).toMatchObject({ sel: null, checked: false });
    expect(currentQuestion(s)?.id).toBe('bug-2');
  });

  it('finishes when the queue is exhausted', () => {
    const s = run(bugs(), ...pickLine(4), next, ...pickLine(3), next, ...pickLine(3), next);
    expect(s.phase).toBe('done');
    expect(s).toMatchObject({ xp: 30, firstTry: 3, hearts: 5 });
    expect(accuracy(s)).toBe(100);
  });

  it('ends the run when hearts run out, even with questions left', () => {
    let s = bugs();
    for (let i = 0; i < 4; i++) s = run(s, ...pickLine(1), next);
    expect(s).toMatchObject({ phase: 'question', hearts: 1 });
    s = run(s, ...pickLine(1));
    expect(s.hearts).toBe(0);
    expect(run(s, next).phase).toBe('out');
  });

  it('ignores answer actions after the run ends', () => {
    const done = run(bugs(), ...pickLine(4), next, ...pickLine(3), next, ...pickLine(3), next);
    expect(run(done, { type: 'select', sel: 2 }, { type: 'check' }, next)).toBe(done);
  });
});

describe('answer actions', () => {
  it('fills build slots left to right from bank indexes and clears them', () => {
    let s = run(startSession('css', 'build', ['build-2']), { type: 'placeWord', bankIndex: 3 }, { type: 'placeWord', bankIndex: 3 });
    expect(s.answer.slots).toEqual([3, null]); // the same chip can't be placed twice
    s = run(s, { type: 'placeWord', bankIndex: 0 }, { type: 'placeWord', bankIndex: 1 });
    expect(s.answer.slots).toEqual([3, 0]); // no empty slot left for chip 1
    s = run(s, { type: 'clearSlot', slot: 0 }, { type: 'placeWord', bankIndex: 1 });
    expect(s.answer.slots).toEqual([1, 0]);
  });

  it('steps tune values within min and max', () => {
    const t = startSession('css', 'tune', ['tune-1']); // start 8, step 4, range 0..48
    expect(run(t, { type: 'step', dir: 1 }).answer.num).toBe(12);
    expect(run(t, { type: 'step', dir: -1 }, { type: 'step', dir: -1 }, { type: 'step', dir: -1 }).answer.num).toBe(0);
  });

  it('locks the answer once checked', () => {
    const s = run(startSession('css', 'type', ['type-1']), { type: 'input', val: 'uppercase' }, { type: 'check' }, { type: 'input', val: 'x' });
    expect(s.answer.val).toBe('uppercase');
  });
});

describe('pairs', () => {
  const pairs = () => startSession('css', 'pairs', ['pairs-1']);
  const pick = (side: 'left' | 'right', id: string): SessionAction => ({ type: 'pickPair', side, id });

  it('matches a left and right pick in either order', () => {
    let s = run(pairs(), pick('left', 'a'), pick('right', 'a'));
    expect(s.answer.matched).toEqual({ a: true });
    s = run(s, pick('right', 'b'), pick('left', 'b'));
    expect(s.answer.matched).toEqual({ a: true, b: true });
    expect(s.answer).toMatchObject({ left: null, right: null });
  });

  it('flags a mismatch without costing a heart', () => {
    const s = run(pairs(), pick('left', 'a'), pick('right', 'b'));
    expect(s.answer).toMatchObject({ miss: { left: 'a', right: 'b' }, misses: 1, left: null, right: null });
    expect(s.hearts).toBe(5);
    expect(run(s, { type: 'clearMiss' }).answer.miss).toBeNull();
  });

  it('clears a showing mismatch as soon as the next tile is picked, and a late clearMiss keeps the new pick', () => {
    const s = run(pairs(), pick('left', 'a'), pick('right', 'b'), pick('left', 'c'));
    expect(s.answer).toMatchObject({ miss: null, left: 'c' });
    expect(run(s, { type: 'clearMiss' }).answer.left).toBe('c');
  });

  it('auto-completes with first-try XP when all four are matched', () => {
    const all = ['a', 'b', 'c', 'd'].flatMap((id) => [pick('left', id), pick('right', id)]);
    const s = run(pairs(), pick('left', 'a'), pick('right', 'b'), ...all);
    expect(s.answer).toMatchObject({ checked: true, ok: true, misses: 1 });
    expect(s).toMatchObject({ xp: 10, firstTry: 1, hearts: 5, solved: 1 });
  });

  it('ignores picks on matched tiles', () => {
    const s = run(pairs(), pick('left', 'a'), pick('right', 'a'), pick('left', 'a'));
    expect(s.answer.left).toBeNull();
  });
});

describe('start', () => {
  it('restarts a run from scratch', () => {
    const s = run(bugs(), ...pickLine(1), { type: 'start', lessonKey: 'bug', ids: ['bug-2'] });
    expect(s).toMatchObject({ hearts: 5, idx: 0, queue: ['bug-2'], missed: {}, xp: 0, phase: 'question' });
  });
});
