// App navigation + progress state. Pure reducer; App hydrates it from and saves it to a ProgressStore.
import { courseById, findCourse, unitByKey, type Course, type CourseId, type LessonKey } from '../content';
import { initialSelection } from '../lib/demo';
import { emptyCourseProgress, type CourseProgress, type Progress } from '../storage/progress';

export type Tab = 'learn' | 'practice';

export type Screen =
  | { name: 'courses' }
  | { name: 'home' }
  | { name: 'learn'; unitKey: string; card: number; selection: number[] }
  | { name: 'quiz'; lessonKey: LessonKey };

export interface AppState {
  screen: Screen;
  tab: Tab;
  /** The active course; null until the learner picks one. Always a course this build ships. */
  course: CourseId | null;
  /** Finished units, finished practice runs and banked XP, per course. */
  courses: Partial<Record<CourseId, CourseProgress>>;
}

export type Action =
  | { type: 'openCourses' }
  | { type: 'selectCourse'; course: CourseId }
  | { type: 'selectTab'; tab: Tab }
  | { type: 'openUnit'; unitKey: string }
  | { type: 'gotoCard'; card: number }
  | { type: 'pickOption'; control: number; option: number }
  | { type: 'finishUnit'; practice: boolean }
  | { type: 'startQuiz'; lessonKey: LessonKey }
  | { type: 'completeQuiz'; lessonKey: LessonKey; xp: number }
  | { type: 'goHome' };

export const initialState: AppState = {
  screen: { name: 'courses' },
  tab: 'learn',
  course: null,
  courses: {},
};

/** Hydrate from storage. A stored course this build doesn't ship falls back to the picker. */
export function stateFromProgress(p: Progress): AppState {
  const course = findCourse(p.activeCourse)?.id ?? null;
  return { ...initialState, course, courses: p.courses, screen: course ? { name: 'home' } : { name: 'courses' } };
}

export function progressFromState(s: AppState): Progress {
  return { activeCourse: s.course, courses: s.courses };
}

/** A course's progress (the active course by default); empty when there is none yet. */
export function courseProgress(s: AppState, id: CourseId | null = s.course): CourseProgress {
  return (id && s.courses[id]) || emptyCourseProgress();
}

function updateCourse(s: AppState, change: (p: CourseProgress) => CourseProgress): AppState {
  if (!s.course) return s;
  return { ...s, courses: { ...s.courses, [s.course]: change(courseProgress(s)) } };
}

function cardScreen(course: Course, unitKey: string, card: number): Screen | null {
  const unit = unitByKey(course, unitKey);
  const c = unit?.cards[card];
  if (!c) return null;
  return { name: 'learn', unitKey, card, selection: initialSelection(c.demo) };
}

export function appReducer(state: AppState, action: Action): AppState {
  const { screen } = state;
  const course = state.course ? courseById(state.course) : null;
  switch (action.type) {
    case 'openCourses':
      return { ...state, screen: { name: 'courses' } };

    case 'selectCourse':
      if (!findCourse(action.course)) return state;
      return { ...state, course: action.course, screen: { name: 'home' }, tab: 'learn' };

    case 'selectTab':
      return { ...state, tab: action.tab };

    case 'openUnit': {
      const next = course && cardScreen(course, action.unitKey, 0);
      return next ? { ...state, screen: next } : state;
    }

    case 'gotoCard': {
      if (screen.name !== 'learn' || !course) return state;
      const next = cardScreen(course, screen.unitKey, action.card);
      return next ? { ...state, screen: next } : state;
    }

    case 'pickOption': {
      if (screen.name !== 'learn') return state;
      const selection = [...screen.selection];
      selection[action.control] = action.option;
      return { ...state, screen: { ...screen, selection } };
    }

    case 'finishUnit': {
      if (screen.name !== 'learn') return state;
      const done = updateCourse(state, (p) => ({ ...p, completedUnits: { ...p.completedUnits, [screen.unitKey]: true } }));
      const next: Screen = action.practice ? { name: 'quiz', lessonKey: `topic:${screen.unitKey}` } : { name: 'home' };
      return { ...done, screen: next, tab: action.practice ? state.tab : 'learn' };
    }

    case 'startQuiz':
      return { ...state, screen: { name: 'quiz', lessonKey: action.lessonKey } };

    case 'completeQuiz':
      return updateCourse(state, (p) => ({
        ...p,
        completedSets: { ...p.completedSets, [action.lessonKey]: true },
        xp: p.xp + action.xp,
      }));

    case 'goHome':
      return { ...state, screen: { name: 'home' } };
  }
}
