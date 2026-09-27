import type { SessionAction } from '../session';
import styles from './WordBank.module.css';

/** Bank chips, tracked by index so the bank may repeat words. A placed chip leaves a ghost so the bank doesn't reflow. */
export function WordBank(props: {
  bank: readonly string[];
  slots: readonly (number | null)[];
  checked: boolean;
  act: (action: SessionAction) => void;
}) {
  const { bank, slots, checked, act } = props;
  return (
    <div className={styles.bank} role="group" aria-label="Word bank">
      {bank.map((word, ci) => {
        const used = slots.includes(ci);
        return (
          <button
            key={ci}
            type="button"
            className={used ? styles.used : styles.chip}
            disabled={used || checked}
            aria-label={used ? `${word}, placed` : word}
            onClick={() => act({ type: 'placeWord', bankIndex: ci })}
          >
            {word}
          </button>
        );
      })}
    </div>
  );
}

/** A blank in the code. Tapping a filled blank sends its word back to the bank. */
export function SlotButton({ n, word, checked, onClear }: { n: number; word: string | null; checked: boolean; onClear: () => void }) {
  return (
    <button
      type="button"
      className={word ? styles.filled : styles.empty}
      disabled={checked}
      aria-label={word ? `Blank ${n}: ${word}. Tap to remove` : `Blank ${n}, empty`}
      onClick={onClear}
    >
      {word}
    </button>
  );
}
