import { describe, expect, it } from 'vitest';
import type { CourseId } from '../content';
import type { CourseProgress } from '../storage/progress';
import { appReducer, courseProgress, initialState, progressFromState, stateFromProgress, type Action, type AppState } from './app';

const inCss: AppState = { ...initialState, course: 'css', screen: { name: 'home' } };
const run = (...actions: Action[]): AppState => actions.reduce(appReducer, inCss);

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
    const s = run({ type: 'selectTab', tab: 'practice' }, { type: 'openUnit', unitKey: 'box' }, { type: 'finishUnit', practice: false });
    expect(courseProgress(s).completedUnits).toEqual({ box: true });
    expect(s.screen).toEqual({ name: 'home' });
    expect(s.tab).toBe('learn');
  });

  it('Practice this marks the unit complete and starts its topic quiz', () => {
    const s = run({ type: 'openUnit', unitKey: 'grid' }, { type: 'finishUnit', practice: true });
    expect(courseProgress(s).completedUnits).toEqual({ grid: true });
    expect(s.screen).toEqual({ name: 'quiz', lessonKey: 'topic:grid' });
  });

  it('records a finished quiz and banks its XP in the active course', () => {
    const s = run(
      { type: 'startQuiz', lessonKey: 'bug' },
      { type: 'completeQuiz', lessonKey: 'bug', xp: 25 },
      { type: 'completeQuiz', lessonKey: 'mixed', xp: 10 },
    );
    expect(s.courses.css).toEqual({ completedUnits: {}, completedSets: { bug: true, mixed: true }, xp: 35 });
  });

  it('keeps courses separate', () => {
    const rust: CourseProgress = { completedUnits: { ownership: true }, completedSets: { mixed: true }, xp: 50 };
    const s = appReducer({ ...inCss, courses: { rust } }, { type: 'completeQuiz', lessonKey: 'mixed', xp: 10 });
    expect(s.courses.rust).toBe(rust);
    expect(s.courses.css).toEqual({ completedUnits: {}, completedSets: { mixed: true }, xp: 10 });
  });

  it('selecting a course goes Home on the Learn tab', () => {
    const s = [{ type: 'selectTab', tab: 'practice' } as Action, { type: 'selectCourse', course: 'css' } as Action].reduce(
      appReducer,
      initialState,
    );
    expect(s).toMatchObject({ course: 'css', screen: { name: 'home' }, tab: 'learn' });
  });

  it('ignores a course this build does not ship', () => {
    expect(appReducer(initialState, { type: 'selectCourse', course: 'go' as CourseId })).toBe(initialState);
  });

  it('opens the picker and keeps the active course', () => {
    expect(run({ type: 'openCourses' })).toMatchObject({ course: 'css', screen: { name: 'courses' } });
  });

  it('ignores course-bound actions before a course is picked', () => {
    expect(appReducer(initialState, { type: 'openUnit', unitKey: 'basics' })).toBe(initialState);
    expect(appReducer(initialState, { type: 'completeQuiz', lessonKey: 'mixed', xp: 10 })).toBe(initialState);
  });
});

describe('stateFromProgress', () => {
  const css: CourseProgress = { completedUnits: { grid: true }, completedSets: {}, xp: 40 };

  it('opens Home in the stored course', () => {
    const s = stateFromProgress({ activeCourse: 'css', courses: { css } });
    expect(s).toMatchObject({ course: 'css', screen: { name: 'home' }, courses: { css } });
    expect(progressFromState(s)).toEqual({ activeCourse: 'css', courses: { css } });
  });

  it('opens the picker when no course, or one this build does not ship, is stored', () => {
    for (const activeCourse of [null, 'go' as CourseId]) {
      expect(stateFromProgress({ activeCourse, courses: { css } })).toMatchObject({
        course: null,
        screen: { name: 'courses' },
        courses: { css },
      });
    }
  });
});
