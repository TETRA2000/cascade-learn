import { CheckIcon, CloseIcon } from '../components/icons';
import type { Tone } from './tone';
import styles from './tone.module.css';

/** ✓ / ✕ badge in a tile's corner after checking. Visual only; the text lives in the tile's accessible name. */
export function ToneMark({ tone }: { tone: Tone }) {
  if (tone !== 'correct' && tone !== 'wrong') return null;
  return (
    <span className={`${styles.mark} ${tone === 'correct' ? styles.markCorrect : styles.markWrong}`} aria-hidden="true">
      {tone === 'correct' ? <CheckIcon size={14} /> : <CloseIcon size={14} strokeWidth={3} />}
    </span>
  );
}
