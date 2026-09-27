import type { Dispatch, ReactNode } from 'react';
import { questionsOfType, type Course } from '../content';
import { Button } from '../components/Button';
import { HeartCount } from '../components/HeartCount';
import { BookIcon, CheckCircleIcon, ChevronDownIcon, ChevronRightIcon, CourseIcon, TargetIcon } from '../components/icons';
import { HEARTS_PER_LESSON } from '../state/rules';
import { courseProgress, type Action, type AppState, type Tab } from '../state/app';
import { totalXp } from '../storage/progress';
import styles from './Home.module.css';

interface Props {
  course: Course;
  state: AppState;
  dispatch: Dispatch<Action>;
}

export function Home({ course, state, dispatch }: Props) {
  return (
    <div className={styles.screen}>
      <div className={styles.scroll}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.wordmark}>Cascade</span>
            <span className={styles.tagline}>{course.tagline}</span>
          </div>
          <button
            type="button"
            className={styles.courseChip}
            aria-label={`${course.name}, change course`}
            onClick={() => dispatch({ type: 'openCourses' })}
          >
            <CourseIcon name={course.icon} size={18} />
            {course.name}
            <ChevronDownIcon size={14} />
          </button>
          <div className={styles.stats}>
            <p className={styles.xp}>{totalXp(state)} XP</p>
            <HeartCount count={HEARTS_PER_LESSON} />
          </div>
        </header>
        {state.tab === 'learn' ? (
          <LearnTab course={course} state={state} dispatch={dispatch} />
        ) : (
          <PracticeTab course={course} state={state} dispatch={dispatch} />
        )}
      </div>
      <nav aria-label="Sections" className={styles.tabs}>
        <TabButton tab="learn" current={state.tab} dispatch={dispatch} icon={<BookIcon />} label="Learn" />
        <TabButton tab="practice" current={state.tab} dispatch={dispatch} icon={<TargetIcon />} label="Practice" />
      </nav>
    </div>
  );
}

function TabButton(props: { tab: Tab; current: Tab; dispatch: Dispatch<Action>; icon: ReactNode; label: string }) {
  const active = props.tab === props.current;
  return (
    <button
      type="button"
      className={styles.tab}
      aria-pressed={active}
      onClick={() => props.dispatch({ type: 'selectTab', tab: props.tab })}
    >
      {props.icon}
      <span>{props.label}</span>
    </button>
  );
}

function LearnTab({ course, state, dispatch }: Props) {
  const done = courseProgress(state).completedUnits;
  const nextUnit = course.units.find((u) => !done[u.key]);
  const hero = nextUnit ?? course.units[0]!;
  const kicker = !nextUnit ? 'All lessons done — review any time' : Object.keys(done).length ? 'Up next' : 'Start here';

  return (
    <div className={styles.tabBody}>
      <Hero
        kicker={kicker}
        title={hero.name}
        blurb={`${hero.blurb} · ${hero.cards.length} short cards`}
        action={nextUnit ? 'Start' : 'Review'}
        onAction={() => dispatch({ type: 'openUnit', unitKey: hero.key })}
      />
      <h2 className={styles.sectionTitle}>Lessons</h2>
      <ul className={styles.list}>
        {course.units.map((u, i) => (
          <li key={u.key}>
            <Row
              n={i + 1}
              badge="learn"
              name={u.name}
              sub={`${u.blurb} · ${u.cards.length} cards`}
              done={!!done[u.key]}
              ariaLabel={`${u.name}, ${u.cards.length} cards${done[u.key] ? ', completed' : ''}`}
              onClick={() => dispatch({ type: 'openUnit', unitKey: u.key })}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PracticeTab({ course, state, dispatch }: Props) {
  const done = courseProgress(state).completedSets;
  return (
    <div className={styles.tabBody}>
      <Hero
        kicker="Today’s practice"
        title="Mixed review"
        blurb={`${course.questionTypes.length} questions — one of every type, easiest to hardest.`}
        action={done.mixed ? 'Go again' : 'Start'}
        onAction={() => dispatch({ type: 'startQuiz', lessonKey: 'mixed' })}
      />
      <h2 className={styles.sectionTitle}>Practice by type</h2>
      <ul className={styles.list}>
        {course.questionTypes.map((t, i) => {
          const count = questionsOfType(course, t.key).length;
          return (
            <li key={t.key}>
              <Row
                n={i + 1}
                badge="practice"
                name={t.name}
                sub={t.blurb}
                done={!!done[t.key]}
                ariaLabel={`${t.name}, ${count} questions${done[t.key] ? ', completed' : ''}`}
                onClick={() => dispatch({ type: 'startQuiz', lessonKey: t.key })}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Hero(props: { kicker: string; title: string; blurb: string; action: string; onAction: () => void }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <span className={styles.kicker}>{props.kicker}</span>
      <h1 id="hero-title" className={styles.heroTitle}>
        {props.title}
      </h1>
      <p className={styles.heroBlurb}>{props.blurb}</p>
      <Button variant="inverse" className={styles.heroButton} onClick={props.onAction}>
        {props.action}
      </Button>
    </section>
  );
}

function Row(props: {
  n: number;
  badge: 'learn' | 'practice';
  name: string;
  sub: string;
  done: boolean;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.row} aria-label={props.ariaLabel} onClick={props.onClick}>
      <span className={`${styles.badge} ${styles[props.badge]}`}>{props.n}</span>
      <span className={styles.rowText}>
        <span className={styles.rowName}>{props.name}</span>
        <span className={styles.rowSub}>{props.sub}</span>
      </span>
      {props.done && <CheckCircleIcon className={styles.done} />}
      <ChevronRightIcon className={styles.chevron} />
    </button>
  );
}
