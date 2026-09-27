import { useEffect, useRef } from 'react';
import type { Question } from '../content';
import { CheckCircleIcon, XCircleIcon } from '../components/icons';
import { RichText } from '../components/RichText';
import { feedbackText } from './feedback';
import type { AnswerState } from './types';
import { useArmed } from './useArmed';
import styles from './FeedbackSheet.module.css';

interface Props {
  question: Question;
  answer: AnswerState;
  /** Queue position, for rotating praise. */
  index: number;
  /** Continue ignores activation this long after appearing (double-tap guard). */
  guardMs: number;
  onContinue: () => void;
}

/** Slides up after Check. Must be rendered inside an always-present aria-live region. */
export function FeedbackSheet({ question, answer, index, guardMs, onContinue }: Props) {
  const { title, detail, compiler } = feedbackText(question, answer, index);
  const continueRef = useRef<HTMLButtonElement>(null);
  const armed = useArmed('sheet', guardMs);

  // Check just disappeared; keep keyboard focus in the flow.
  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  return (
    <section className={`${styles.sheet} ${answer.ok ? styles.ok : styles.bad}`} aria-label="Feedback">
      <div className={styles.head}>
        {answer.ok ? <CheckCircleIcon size={28} /> : <XCircleIcon size={28} />}
        <h2 className={styles.title}>{title}</h2>
      </div>
      {detail && <p className={styles.detail}>{detail}</p>}
      <p className={styles.explain}>
        <RichText text={question.explain} />
      </p>
      {compiler && (
        <figure className={styles.compiler}>
          <figcaption className={styles.compilerLabel}>rustc says</figcaption>
          <pre className={styles.compilerText}>{compiler}</pre>
        </figure>
      )}
      <button
        ref={continueRef}
        type="button"
        className={styles.continue}
        aria-disabled={armed ? undefined : true}
        onClick={() => armed && onContinue()}
      >
        Continue
      </button>
    </section>
  );
}
