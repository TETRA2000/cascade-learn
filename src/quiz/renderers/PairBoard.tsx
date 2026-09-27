import { useEffect, type ReactNode } from 'react';
import { PAIR_MISS_FLASH_MS } from '../../state/rules';
import type { SessionAction } from '../session';
import { ToneMark } from '../ToneMark';
import toneStyles from '../tone.module.css';
import type { AnswerState } from '../types';
import styles from './PairBoard.module.css';

type PairTone = 'idle' | 'selected' | 'wrong' | 'done';

function pairTone(a: AnswerState, id: string, side: 'left' | 'right'): PairTone {
  if (a.matched[id]) return 'done';
  if (a.miss?.[side] === id) return 'wrong';
  if (a[side] === id) return 'selected';
  return 'idle';
}

const SUFFIX: Record<PairTone, string> = { idle: '', selected: '', wrong: ', not a match', done: ', matched' };

/** What one tile shows. `label` is its accessible name (before the match-state suffix). */
export interface PairFace {
  label: string;
  content: ReactNode;
  className?: string;
}

interface Props {
  /** Left column, top to bottom. */
  ids: readonly string[];
  /** Right column, top to bottom. */
  order: readonly string[];
  answer: AnswerState;
  act: (action: SessionAction) => void;
  leftLabel: string;
  rightLabel: string;
  left: (id: string) => PairFace;
  right: (id: string) => PairFace;
}

/** Tap a tile on each side to match them. Checks every pair; never costs hearts. */
export function PairBoard({ ids, order, answer, act, leftLabel, rightLabel, left, right }: Props) {
  // Clear the mismatch highlight after a moment. A newer pick clears `miss`
  // first, which cancels this timer.
  useEffect(() => {
    if (!answer.miss) return;
    const timer = setTimeout(() => act({ type: 'clearMiss' }), PAIR_MISS_FLASH_MS);
    return () => clearTimeout(timer);
  }, [answer.miss, act]);

  const column = (side: 'left' | 'right', list: readonly string[], face: (id: string) => PairFace, label: string) => (
    <div className={styles.column} role="group" aria-label={label}>
      {list.map((id) => {
        const t = pairTone(answer, id, side);
        const f = face(id);
        return (
          <button
            key={id}
            type="button"
            className={`${toneStyles.tile} ${t === 'done' ? styles.done : toneStyles[t]} ${styles.tile} ${f.className ?? ''}`}
            disabled={t === 'done'}
            aria-pressed={t === 'selected'}
            aria-label={`${f.label}${SUFFIX[t]}`}
            onClick={() => act({ type: 'pickPair', side, id })}
          >
            {f.content}
            <ToneMark tone={t === 'done' ? 'correct' : t === 'wrong' ? 'wrong' : 'idle'} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={styles.columns}>
      {column('left', ids, left, leftLabel)}
      {column('right', order, right, rightLabel)}
    </div>
  );
}
