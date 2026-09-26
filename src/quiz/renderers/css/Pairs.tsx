import { useEffect } from 'react';
import type { PairsQuestion } from '../../../content';
import { CssBox } from '../../../components/CssBox';
import { PAIR_MISS_FLASH_MS } from '../../../state/rules';
import { ToneMark } from '../../ToneMark';
import toneStyles from '../../tone.module.css';
import type { AnswerState } from '../../types';
import type { RendererProps } from '../types';
import styles from './Pairs.module.css';

type PairTone = 'idle' | 'selected' | 'wrong' | 'done';

function pairTone(a: AnswerState, id: string, side: 'left' | 'right'): PairTone {
  if (a.matched[id]) return 'done';
  if (a.miss?.[side] === id) return 'wrong';
  if (a[side] === id) return 'selected';
  return 'idle';
}

const SUFFIX: Record<PairTone, string> = { idle: '', selected: '', wrong: ', not a match', done: ', matched' };

/** Tap a property, then what it draws. Checks on every pair; never costs hearts. */
export function Pairs({ question: q, answer, act }: RendererProps<PairsQuestion>) {
  // Clear the mismatch highlight after a moment. A newer pick clears `miss`
  // first, which cancels this timer.
  useEffect(() => {
    if (!answer.miss) return;
    const timer = setTimeout(() => act({ type: 'clearMiss' }), PAIR_MISS_FLASH_MS);
    return () => clearTimeout(timer);
  }, [answer.miss, act]);

  const byId = new Map(q.items.map((it) => [it.id, it]));
  const tileClass = (t: PairTone) =>
    `${toneStyles.tile} ${t === 'done' ? styles.done : toneStyles[t]} ${styles.tile}`;
  const mark = (t: PairTone) => <ToneMark tone={t === 'done' ? 'correct' : t === 'wrong' ? 'wrong' : 'idle'} />;

  return (
    <div className={styles.columns}>
      <div className={styles.column} role="group" aria-label="Properties">
        {q.items.map((it) => {
          const t = pairTone(answer, it.id, 'left');
          return (
            <button
              key={it.id}
              type="button"
              className={`${tileClass(t)} ${styles.code}`}
              disabled={t === 'done'}
              aria-pressed={t === 'selected'}
              aria-label={`${it.code}${SUFFIX[t]}`}
              onClick={() => act({ type: 'pickPair', side: 'left', id: it.id })}
            >
              {it.code}
              {mark(t)}
            </button>
          );
        })}
      </div>
      <div className={styles.column} role="group" aria-label="Results">
        {q.order.map((id) => {
          const it = byId.get(id)!;
          const t = pairTone(answer, id, 'right');
          return (
            <button
              key={id}
              type="button"
              className={tileClass(t)}
              disabled={t === 'done'}
              aria-pressed={t === 'selected'}
              aria-label={`${it.label}${SUFFIX[t]}`}
              onClick={() => act({ type: 'pickPair', side: 'right', id })}
            >
              <CssBox css={it.shape}>{it.text}</CssBox>
              {mark(t)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
