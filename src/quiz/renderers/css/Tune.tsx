import type { TuneQuestion } from '../../../content';
import { CssBox } from '../../../components/CssBox';
import { MinusIcon, PlusIcon } from '../../../components/icons';
import { tuneLayer, type TuneLayer } from '../../previews';
import type { RendererProps } from '../types';
import styles from './Tune.module.css';

/** Nudge a value until your boxes fill the dashed ghost target. */
export function Tune({ question: q, answer, act }: RendererProps<TuneQuestion>) {
  const decOff = answer.checked || answer.num <= q.min;
  const incOff = answer.checked || answer.num >= q.max;

  const layer = (l: TuneLayer, testId: string) => (
    <CssBox className={styles.row} css={l.row} data-testid={testId}>
      {Array.from({ length: q.count }, (_, i) => (
        <CssBox key={i} css={l.kid}>
          {q.text}
        </CssBox>
      ))}
    </CssBox>
  );

  return (
    <>
      {/* Purely visual; the value readout below carries the state for screen readers. */}
      <div className={styles.stage} aria-hidden="true">
        {layer(tuneLayer(q, q.ghost, q.target), 'tune-ghost')}
        {layer(tuneLayer(q, q.yours, answer.num), 'tune-yours')}
      </div>
      <ul className={styles.legend} aria-hidden="true">
        <li>
          <span className={styles.target} />
          Target
        </li>
        <li>
          <span className={styles.yours} />
          Yours
        </li>
      </ul>
      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.step}
          aria-label="Decrease value"
          disabled={decOff}
          onClick={() => act({ type: 'step', dir: -1 })}
        >
          <MinusIcon />
        </button>
        <output className={styles.value} aria-live="polite">
          <span className={styles.prop}>{q.prop}</span>: <span className={styles.val}>{`${answer.num}${q.unit}`}</span>;
        </output>
        <button
          type="button"
          className={styles.step}
          aria-label="Increase value"
          disabled={incOff}
          onClick={() => act({ type: 'step', dir: 1 })}
        >
          <PlusIcon />
        </button>
      </div>
    </>
  );
}
