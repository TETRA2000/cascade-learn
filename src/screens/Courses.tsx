import { useEffect, useRef, type Dispatch } from 'react';
import { courses } from '../content';
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, CourseIcon } from '../components/icons';
import { courseProgress, type Action, type AppState } from '../state/app';
import styles from './Courses.module.css';

export function Courses({ state, dispatch }: { state: AppState; dispatch: Dispatch<Action> }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        {state.course && (
          <button type="button" className={styles.back} aria-label="Back" onClick={() => dispatch({ type: 'goHome' })}>
            <ChevronLeftIcon />
          </button>
        )}
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
          Choose a course
        </h1>
      </header>
      <ul className={styles.list}>
        {courses.map((c) => {
          const p = courseProgress(state, c.id);
          const done = c.units.filter((u) => p.completedUnits[u.key]).length;
          const current = c.id === state.course;
          return (
            <li key={c.id}>
              <button
                type="button"
                className={styles.course}
                aria-current={current ? 'true' : undefined}
                aria-label={`${c.name}, ${done} of ${c.units.length} units, ${p.xp} XP${current ? ', current' : ''}`}
                onClick={() => dispatch({ type: 'selectCourse', course: c.id })}
              >
                <span className={styles.icon}>
                  <CourseIcon name={c.icon} size={28} />
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{c.name}</span>
                  <span className={styles.blurb}>{c.blurb}</span>
                  <span className={styles.meta}>
                    {done} / {c.units.length} units · {p.xp} XP
                  </span>
                </span>
                {current ? (
                  <span className={styles.current}>
                    <CheckCircleIcon size={20} />
                    Current
                  </span>
                ) : (
                  <ChevronRightIcon className={styles.chevron} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
