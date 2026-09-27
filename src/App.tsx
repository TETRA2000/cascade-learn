import { useEffect, useReducer } from 'react';
import { courseById } from './content';
import { Quiz } from './quiz/Quiz';
import { Courses } from './screens/Courses';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { appReducer, stateFromProgress } from './state/app';
import { localProgressStore, type ProgressStore } from './storage/progress';
import styles from './App.module.css';

const defaultStore = localProgressStore();

export function App({ store = defaultStore }: { store?: ProgressStore }) {
  const [state, dispatch] = useReducer(appReducer, store, (s) => stateFromProgress(s.load()));
  const { screen, course: activeCourse, courses: progress } = state;
  const course = activeCourse ? courseById(activeCourse) : null;

  // Save on progress changes only, not on every navigation.
  useEffect(() => {
    store.save({ activeCourse, courses: progress });
  }, [store, activeCourse, progress]);

  return (
    <div className={styles.frame}>
      {(screen.name === 'courses' || !course) && <Courses state={state} dispatch={dispatch} />}
      {course && screen.name === 'home' && <Home course={course} state={state} dispatch={dispatch} />}
      {course && screen.name === 'learn' && (
        <Learn
          key={`${course.id}:${screen.unitKey}`}
          course={course}
          unitKey={screen.unitKey}
          card={screen.card}
          selection={screen.selection}
          dispatch={dispatch}
        />
      )}
      {course && screen.name === 'quiz' && (
        <Quiz
          key={`${course.id}:${screen.lessonKey}`}
          courseId={course.id}
          lessonKey={screen.lessonKey}
          onExit={() => dispatch({ type: 'goHome' })}
          onComplete={({ lessonKey, xp }) => dispatch({ type: 'completeQuiz', lessonKey, xp })}
        />
      )}
    </div>
  );
}
