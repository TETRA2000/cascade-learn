import { useState, type Dispatch } from 'react';
import { lessonName, lessonQuestionIds, type LessonKey } from '../content';
import { Button } from '../components/Button';
import { CloseIcon } from '../components/icons';
import type { Action } from '../state/app';
import styles from './QuizPlaceholder.module.css';

/** Stand-in for the quiz engine (build step 4). Shows the queue a run would start with. */
export function QuizPlaceholder({ lessonKey, dispatch }: { lessonKey: LessonKey; dispatch: Dispatch<Action> }) {
  const [queue] = useState(() => lessonQuestionIds(lessonKey));
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.close} aria-label="Quit lesson" onClick={() => dispatch({ type: 'goHome' })}>
          <CloseIcon />
        </button>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{lessonName(lessonKey)}</h1>
        <p className={styles.text}>
          {queue.length} questions queued. Practice quizzes arrive with the quiz engine in the next build step.
        </p>
        <Button onClick={() => dispatch({ type: 'goHome' })}>Back to home</Button>
      </main>
    </div>
  );
}
