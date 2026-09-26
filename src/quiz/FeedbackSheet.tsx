import { useEffect, useRef } from 'react';
import type { Question } from '../content';
import { CheckCircleIcon, XCircleIcon } from '../components/icons';
import { RichText } from '../components/RichText';
import { feedbackText } from './feedback';
import type { AnswerState } from './types';
import styles from './FeedbackSheet.module.css';

interface Props {
  question: Question;
  answer: AnswerState;
  /** Queue position, for rotating praise. */
  index: number;
  onContinue: () => void;
}

/** Slides up after Check. Must be rendered inside an always-present aria-live region. */
export function FeedbackSheet({ question, answer, index, onContinue }: Props) {
  const { title, detail } = feedbackText(question, answer, index);
  const continueRef = useRef<HTMLButtonElement>(null);

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
      <button ref={continueRef} type="button" className={styles.continue} onClick={onContinue}>
        Continue
      </button>
    </section>
  );
}
