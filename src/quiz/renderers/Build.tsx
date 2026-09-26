import type { BuildQuestion } from '../../content';
import { CodeTokens } from '../../components/CodePanel';
import { CssBox } from '../../components/CssBox';
import { buildPreview, type BuildPreview } from '../previews';
import type { RendererProps } from './types';
import preview from './preview.module.css';
import styles from './Build.module.css';

/** Fill the blanks from a word bank; "Yours" renders wrong picks too. Chips are tracked by bank index. */
export function Build({ question: q, answer, act }: RendererProps<BuildQuestion>) {
  const words = answer.slots.map((ci) => (ci === null ? null : (q.bank[ci] ?? null)));

  return (
    <>
      <div className={preview.pair}>
        <Preview label="Goal" preview={buildPreview(q, q.answer)} testId="build-goal" />
        <Preview label="Yours (live)" preview={buildPreview(q, words)} testId="build-yours" />
      </div>

      <div className={styles.code}>
        {q.code.map((line, i) => {
          if (typeof line === 'string') {
            return (
              <div key={i} className={styles.line}>
                <CodeTokens line={line} />
              </div>
            );
          }
          const n = line.slot + 1;
          const word = words[line.slot] ?? null;
          return (
            <div key={i} className={styles.slotLine}>
              <span className={styles.prop}>{q.props[line.slot]}</span>:
              <button
                type="button"
                className={word ? styles.filled : styles.empty}
                disabled={answer.checked}
                aria-label={word ? `Blank ${n}: ${word}. Tap to remove` : `Blank ${n}, empty`}
                onClick={() => act({ type: 'clearSlot', slot: line.slot })}
              >
                {word}
              </button>
              ;
            </div>
          );
        })}
      </div>

      <div className={styles.bank} role="group" aria-label="Word bank">
        {q.bank.map((word, ci) => {
          const used = answer.slots.includes(ci);
          return (
            <button
              key={ci}
              type="button"
              className={used ? styles.used : styles.chip}
              disabled={used || answer.checked}
              aria-label={used ? `${word}, placed` : word}
              onClick={() => act({ type: 'placeWord', bankIndex: ci })}
            >
              {word}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Preview({ label, preview: p, testId }: { label: string; preview: BuildPreview; testId: string }) {
  return (
    <figure className={preview.figure}>
      <figcaption className={preview.caption}>{label}</figcaption>
      <CssBox css={p.box} data-testid={testId}>
        {p.kids.map((k, i) => (
          <CssBox key={i} css={k.s}>
            {k.t}
          </CssBox>
        ))}
      </CssBox>
    </figure>
  );
}
