import { useReducer } from 'react';
import { Home } from './screens/Home';
import { Learn } from './screens/Learn';
import { QuizPlaceholder } from './screens/QuizPlaceholder';
import { appReducer, initialState, type AppState } from './state/app';
import styles from './App.module.css';

export function App({ initial = initialState }: { initial?: AppState }) {
  const [state, dispatch] = useReducer(appReducer, initial);
  const { screen } = state;

  return (
    <div className={styles.frame}>
      {screen.name === 'home' && <Home state={state} dispatch={dispatch} />}
      {screen.name === 'learn' && (
        <Learn key={screen.unitKey} unitKey={screen.unitKey} card={screen.card} selection={screen.selection} dispatch={dispatch} />
      )}
      {screen.name === 'quiz' && <QuizPlaceholder key={screen.lessonKey} lessonKey={screen.lessonKey} dispatch={dispatch} />}
    </div>
  );
}
