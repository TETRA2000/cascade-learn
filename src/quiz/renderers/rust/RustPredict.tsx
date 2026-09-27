import type { RustPredictQuestion } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { tone, toneLabel } from '../../tone';
import { ToneMark } from '../../ToneMark';
import toneStyles from '../../tone.module.css';
import type { RendererProps } from '../types';
import choice from './choice.module.css';
import styles from './RustPredict.module.css';

/** Read Rust, pick what it prints — or that it doesn't compile. */
export function RustPredict({ question: q, answer, act }: RendererProps<RustPredictQuestion>) {
  return (
    <>
      <CodePanel lines={q.code} lang="rust" label="Rust code" />
      <div className={choice.list} role="group" aria-label="Options">
        {q.opts.map((o, i) => {
          const letter = String.fromCharCode(65 + i);
          const t = tone(answer.sel === i, i === q.answer, answer.checked);
          return (
            <button
              key={i}
              type="button"
              className={`${toneStyles.tile} ${toneStyles[t]} ${choice.tile}`}
              aria-pressed={answer.sel === i}
              aria-label={`Option ${letter}: ${o.text}${toneLabel(t)}`}
              onClick={() => act({ type: 'select', sel: i })}
            >
              <span className={choice.letter}>{letter}</span>
              <span className={o.kind === 'output' ? styles.output : styles.error}>{o.text}</span>
              <ToneMark tone={t} />
            </button>
          );
        })}
      </div>
    </>
  );
}
