import type { BuildQuestion } from '../../../content';
import { CodeTokens } from '../../../components/CodePanel';
import { CssBox } from '../../../components/CssBox';
import { buildPreview, type BuildPreview } from '../../previews';
import type { RendererProps } from '../types';
import { SlotButton, WordBank } from '../WordBank';
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
              <SlotButton n={n} word={word} checked={answer.checked} onClear={() => act({ type: 'clearSlot', slot: line.slot })} />
              ;
            </div>
          );
        })}
      </div>

      <WordBank bank={q.bank} slots={answer.slots} checked={answer.checked} act={act} />
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
