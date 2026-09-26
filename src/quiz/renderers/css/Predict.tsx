import type { PredictQuestion } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { CssBox } from '../../../components/CssBox';
import { tone, toneLabel } from '../../tone';
import { ToneMark } from '../../ToneMark';
import toneStyles from '../../tone.module.css';
import type { RendererProps } from '../types';
import styles from './Predict.module.css';

/** Read CSS, pick the picture. Every option is drawn with real CSS from the question data. */
export function Predict({ question: q, answer, act }: RendererProps<PredictQuestion>) {
  return (
    <>
      <CodePanel lines={q.code} label="CSS" />
      <div className={styles.grid}>
        {q.opts.map((o, i) => {
          const letter = String.fromCharCode(65 + i);
          const t = tone(answer.sel === i, i === q.answer, answer.checked);
          return (
            <button
              key={i}
              type="button"
              className={`${toneStyles.tile} ${toneStyles[t]} ${styles.tile}`}
              aria-pressed={answer.sel === i}
              aria-label={`Option ${letter}: ${o.d}${toneLabel(t)}`}
              onClick={() => act({ type: 'select', sel: i })}
            >
              <CssBox className={styles.stage} css={`${q.stage};${o.s}`}>
                {(o.kids ?? q.kids).map((k, j) => (
                  <CssBox key={j} css={k} />
                ))}
              </CssBox>
              <span className={styles.letter}>{letter}</span>
              <ToneMark tone={t} />
            </button>
          );
        })}
      </div>
    </>
  );
}
