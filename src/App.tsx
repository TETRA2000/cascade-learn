import { useEffect, useReducer } from 'react';
import { courseById } from './content';
import { Quiz } from './quiz/Quiz';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { appReducer, initialState } from './state/app';
import { emptyCourseProgress, localProgressStore, type ProgressStore } from './storage/progress';
import styles from './App.module.css';

const defaultStore = localProgressStore();

export function App({ store = defaultStore }: { store?: ProgressStore }) {
  // CSS-only bridge between v2 storage and the single-course AppState.
  const [state, dispatch] = useReducer(appReducer, store, (s) => {
    const css = s.load().courses.css ?? emptyCourseProgress();
    return { ...initialState, completedUnits: css.completedUnits, completedSets: css.completedSets, totalXp: css.xp };
  });
  const { screen, completedUnits, completedSets, totalXp } = state;
  const course = courseById(state.course);

  useEffect(() => {
    store.save({ activeCourse: 'css', courses: { css: { completedUnits, completedSets, xp: totalXp } } });
  }, [store, completedUnits, completedSets, totalXp]);

  return (
    <div className={styles.frame}>
      {screen.name === 'home' && <Home course={course} state={state} dispatch={dispatch} />}
      {screen.name === 'learn' && (
        <Learn
          key={screen.unitKey}
          course={course}
          unitKey={screen.unitKey}
          card={screen.card}
          selection={screen.selection}
          dispatch={dispatch}
        />
      )}
      {screen.name === 'quiz' && (
        <Quiz
          key={screen.lessonKey}
          courseId={course.id}
          lessonKey={screen.lessonKey}
          onExit={() => dispatch({ type: 'goHome' })}
          onComplete={({ lessonKey, xp }) => dispatch({ type: 'completeQuiz', lessonKey, xp })}
        />
      )}
    </div>
  );
}
