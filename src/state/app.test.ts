import { describe, expect, it } from 'vitest';
import { appReducer, initialState, type AppState } from './app';

const run = (...actions: Parameters<typeof appReducer>[1][]): AppState => actions.reduce(appReducer, initialState);

describe('appReducer', () => {
  it('opens a unit on its first card with the knobs at their start values', () => {
    const s = run({ type: 'openUnit', unitKey: 'basics' });
    expect(s.screen).toEqual({ name: 'learn', unitKey: 'basics', card: 0, selection: [1, 1] });
  });

  it('ignores unknown units and out-of-range cards', () => {
    expect(run({ type: 'openUnit', unitKey: 'nope' }).screen).toEqual({ name: 'home' });
    const s = run({ type: 'openUnit', unitKey: 'grid' }, { type: 'gotoCard', card: 99 });
    expect(s.screen).toMatchObject({ card: 0 });
  });

  it('resets the playground when changing cards', () => {
    const s = run(
      { type: 'openUnit', unitKey: 'flex' },
      { type: 'pickOption', control: 0, option: 1 },
      { type: 'gotoCard', card: 1 },
      { type: 'gotoCard', card: 0 },
    );
    expect(s.screen).toMatchObject({ card: 0, selection: [0] });
  });

  it('records knob picks', () => {
    const s = run({ type: 'openUnit', unitKey: 'basics' }, { type: 'pickOption', control: 1, option: 2 });
    expect(s.screen).toMatchObject({ selection: [1, 2] });
  });

  it('Done marks the unit complete and returns to the Learn tab', () => {
    const s = run(
      { type: 'selectTab', tab: 'practice' },
      { type: 'openUnit', unitKey: 'box' },
      { type: 'finishUnit', practice: false },
    );
    expect(s.completedUnits).toEqual({ box: true });
    expect(s.screen).toEqual({ name: 'home' });
    expect(s.tab).toBe('learn');
  });

  it('Practice this marks the unit complete and starts its topic quiz', () => {
    const s = run({ type: 'openUnit', unitKey: 'grid' }, { type: 'finishUnit', practice: true });
    expect(s.completedUnits).toEqual({ grid: true });
    expect(s.screen).toEqual({ name: 'quiz', lessonKey: 'topic:grid' });
  });

  it('records a finished quiz and banks its XP', () => {
    const s = run(
      { type: 'startQuiz', lessonKey: 'bug' },
      { type: 'completeQuiz', lessonKey: 'bug', xp: 25 },
      { type: 'completeQuiz', lessonKey: 'mixed', xp: 10 },
    );
    expect(s.completedSets).toEqual({ bug: true, mixed: true });
    expect(s.totalXp).toBe(35);
  });
});
