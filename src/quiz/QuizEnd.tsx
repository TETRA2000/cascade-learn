import { useEffect, useRef } from 'react';
import { courseById, lessonName } from '../content';
import { Button } from '../components/Button';
import { BrokenHeartIcon, StarIcon } from '../components/icons';
import { accuracy } from './session';
import type { Session } from './types';
import styles from './QuizEnd.module.css';

function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

export function QuizDone({ session, onHome, onRetry }: { session: Session; onHome: () => void; onRetry: () => void }) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const perfect = session.firstTry === session.total;
  return (
    <div className={styles.screen}>
      <StarIcon />
      <div className={styles.titles}>
        <h1 ref={heading} tabIndex={-1} className={`${styles.title} ${styles.done}`}>
          Lesson complete!
        </h1>
        <p className={styles.sub}>{lessonName(courseById(session.courseId), session.lessonKey)}</p>
      </div>
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>XP</dt>
          <dd>+{session.xp}</dd>
        </div>
        <div className={styles.stat}>
          <dt>First try</dt>
          <dd>{accuracy(session)}%</dd>
        </div>
        <div className={styles.stat}>
          <dt>Hearts</dt>
          <dd className={styles.hearts}>{session.hearts}</dd>
        </div>
      </dl>
      <p className={styles.sub}>
        {perfect ? 'Perfect run — every answer right on the first try.' : 'Missed questions came back until you got them. That’s the point.'}
      </p>
      <div className={styles.actions}>
        <Button onClick={onHome}>Continue</Button>
        <Button variant="secondary" onClick={onRetry}>
          Practice again
        </Button>
      </div>
    </div>
  );
}

export function QuizOut({ onHome, onRetry }: { onHome: () => void; onRetry: () => void }) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  return (
    <div className={styles.screen}>
      <BrokenHeartIcon />
      <div className={styles.titles}>
        <h1 ref={heading} tabIndex={-1} className={`${styles.title} ${styles.out}`}>
          Out of hearts
        </h1>
        <p className={styles.sub}>Mistakes are how CSS sticks. Every question you missed will be waiting for you next run.</p>
      </div>
      <div className={styles.actions}>
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="secondary" onClick={onHome}>
          Back to home
        </Button>
      </div>
    </div>
  );
}
