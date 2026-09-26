import { useEffect, useReducer, useRef, type Dispatch } from 'react';
import { lessonQuestionIds, questionTypes, type LessonKey } from '../content';
import { Button } from '../components/Button';
import { HeartCount } from '../components/HeartCount';
import { CloseIcon } from '../components/icons';
import { ProgressBar } from '../components/ProgressBar';
import { FeedbackSheet } from './FeedbackSheet';
import { canCheck } from './grade';
import { QuizDone, QuizOut } from './QuizEnd';
import { QuestionBody } from './renderers/QuestionBody';
import { currentQuestion, sessionReducer, startSession, type SessionAction } from './session';
import type { Session } from './types';
import styles from './Quiz.module.css';

export interface QuizResult {
  lessonKey: LessonKey;
  xp: number;
}

interface Props {
  lessonKey: LessonKey;
  onExit: () => void;
  /** Called once per finished run (queue exhausted) — never for an out-of-hearts run. */
  onComplete: (result: QuizResult) => void;
}

export function Quiz({ lessonKey, onExit, onComplete }: Props) {
  const [session, dispatch] = useReducer(sessionReducer, lessonKey, (key) => startSession(key, lessonQuestionIds(key)));
  const restart = () => dispatch({ type: 'start', lessonKey, ids: lessonQuestionIds(lessonKey) });

  // A finished session never changes again (the reducer ignores everything but
  // 'start'), so remembering which one we reported makes this exactly-once.
  const reported = useRef<Session | null>(null);
  useEffect(() => {
    if (session.phase === 'done' && reported.current !== session) {
      reported.current = session;
      onComplete({ lessonKey: session.lessonKey, xp: session.xp });
    }
  }, [session, onComplete]);

  if (session.phase === 'done') return <QuizDone session={session} onHome={onExit} onRetry={restart} />;
  if (session.phase === 'out') return <QuizOut onHome={onExit} onRetry={restart} />;
  return <QuizQuestion session={session} dispatch={dispatch} onExit={onExit} />;
}

function QuizQuestion({ session, dispatch, onExit }: { session: Session; dispatch: Dispatch<SessionAction>; onExit: () => void }) {
  const q = currentQuestion(session)!; // phase 'question' guarantees a current question
  const a = session.answer;
  const promptRef = useRef<HTMLHeadingElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // New question: start at the top and announce its prompt.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    promptRef.current?.focus({ preventScroll: true });
  }, [session.idx]);

  const pct = session.total ? Math.round((session.solved / session.total) * 100) : 0;
  const hearts = session.hearts;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.close} aria-label="Quit lesson" onClick={onExit}>
          <CloseIcon />
        </button>
        <ProgressBar label="Lesson progress" value={pct} />
        <HeartCount count={hearts} label={`${hearts} ${hearts === 1 ? 'heart' : 'hearts'} left`} />
      </header>

      <div className={styles.titleBlock}>
        <span className={styles.typeChip}>{questionTypes.find((t) => t.key === q.type)?.name}</span>
        <h1 ref={promptRef} tabIndex={-1} className={styles.prompt}>
          {q.prompt}
        </h1>
      </div>

      <main ref={mainRef} className={styles.main}>
        <QuestionBody key={session.idx} question={q} answer={a} act={dispatch} />
      </main>

      <div className={styles.footer}>
        {!a.checked && q.type !== 'pairs' && (
          <div className={styles.bar}>
            <Button className={styles.check} disabled={!canCheck(q, a)} onClick={() => dispatch({ type: 'check' })}>
              Check
            </Button>
          </div>
        )}
        {!a.checked && q.type === 'pairs' && (
          <div className={`${styles.bar} ${styles.hint}`}>
            <p>Tap a property, then its result.</p>
            <span>
              {Object.keys(a.matched).length} / {q.items.length}
            </span>
          </div>
        )}
        <div aria-live="polite">
          {a.checked && <FeedbackSheet question={q} answer={a} index={session.idx} onContinue={() => dispatch({ type: 'next' })} />}
        </div>
      </div>
    </div>
  );
}
