import { useEffect, useReducer } from 'react';
import { Quiz } from './quiz/Quiz';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { appReducer, initialState } from './state/app';
import { localProgressStore, type ProgressStore } from './storage/progress';
import styles from './App.module.css';

const defaultStore = localProgressStore();

export function App({ store = defaultStore }: { store?: ProgressStore }) {
  const [state, dispatch] = useReducer(appReducer, store, (s) => ({ ...initialState, ...s.load() }));
  const { screen, completedUnits, completedSets, totalXp } = state;

  useEffect(() => {
    store.save({ completedUnits, completedSets, totalXp });
  }, [store, completedUnits, completedSets, totalXp]);

  return (
    <div className={styles.frame}>
      {screen.name === 'home' && <Home state={state} dispatch={dispatch} />}
      {screen.name === 'learn' && (
        <Learn key={screen.unitKey} unitKey={screen.unitKey} card={screen.card} selection={screen.selection} dispatch={dispatch} />
      )}
      {screen.name === 'quiz' && (
        <Quiz
          key={screen.lessonKey}
          lessonKey={screen.lessonKey}
          onExit={() => dispatch({ type: 'goHome' })}
          onComplete={({ lessonKey, xp }) => dispatch({ type: 'completeQuiz', lessonKey, xp })}
        />
      )}
    </div>
  );
}
