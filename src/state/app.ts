// App navigation + progress state. Pure reducer so it is easy to test and,
// in step 7, to hydrate from / persist to storage.
import { unitByKey, type LessonKey } from '../content';
import { initialSelection } from '../lib/demo';

export type Tab = 'learn' | 'practice';

export type Screen =
  | { name: 'home' }
  | { name: 'learn'; unitKey: string; card: number; selection: number[] }
  | { name: 'quiz'; lessonKey: LessonKey };

export interface AppState {
  screen: Screen;
  tab: Tab;
  /** Units whose last card the learner has reached and finished. */
  completedUnits: Record<string, true>;
  /** Practice runs (by LessonKey) finished at least once. */
  completedSets: Partial<Record<LessonKey, true>>;
  /** XP banked from finished practice runs. */
  totalXp: number;
}

export type Action =
  | { type: 'selectTab'; tab: Tab }
  | { type: 'openUnit'; unitKey: string }
  | { type: 'gotoCard'; card: number }
  | { type: 'pickOption'; control: number; option: number }
  | { type: 'finishUnit'; practice: boolean }
  | { type: 'startQuiz'; lessonKey: LessonKey }
  | { type: 'completeQuiz'; lessonKey: LessonKey; xp: number }
  | { type: 'goHome' };

export const initialState: AppState = {
  screen: { name: 'home' },
  tab: 'learn',
  completedUnits: {},
  completedSets: {},
  totalXp: 0,
};

function cardScreen(unitKey: string, card: number): Screen | null {
  const unit = unitByKey(unitKey);
  const c = unit?.cards[card];
  if (!c) return null;
  return { name: 'learn', unitKey, card, selection: initialSelection(c.demo) };
}

export function appReducer(state: AppState, action: Action): AppState {
  const { screen } = state;
  switch (action.type) {
    case 'selectTab':
      return { ...state, tab: action.tab };

    case 'openUnit': {
      const next = cardScreen(action.unitKey, 0);
      return next ? { ...state, screen: next } : state;
    }

    case 'gotoCard': {
      if (screen.name !== 'learn') return state;
      const next = cardScreen(screen.unitKey, action.card);
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
      const completedUnits = { ...state.completedUnits, [screen.unitKey]: true as const };
      const next: Screen = action.practice
        ? { name: 'quiz', lessonKey: `topic:${screen.unitKey}` }
        : { name: 'home' };
      return { ...state, completedUnits, screen: next, tab: action.practice ? state.tab : 'learn' };
    }

    case 'startQuiz':
      return { ...state, screen: { name: 'quiz', lessonKey: action.lessonKey } };

    case 'completeQuiz':
      return {
        ...state,
        completedSets: { ...state.completedSets, [action.lessonKey]: true },
        totalXp: state.totalXp + action.xp,
      };

    case 'goHome':
      return { ...state, screen: { name: 'home' } };
  }
}
