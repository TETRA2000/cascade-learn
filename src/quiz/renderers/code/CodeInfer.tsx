import type { TsInferQuestion } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { LANG } from '../../../lib/codeLang';
import { tone, toneLabel } from '../../tone';
import { ToneMark } from '../../ToneMark';
import toneStyles from '../../tone.module.css';
import type { RendererProps } from '../types';
import choice from './choice.module.css';
import styles from './CodeInfer.module.css';

/** "Hover the type": pick the type the editor shows for the marked name, narrowing included. */
export function CodeInfer({ question: q, answer, act }: RendererProps<TsInferQuestion>) {
  return (
    <>
      <CodePanel
        lines={q.code}
        lang="ts"
        label={`${LANG.ts.codeLabel}, ${q.name} on line ${q.line}`}
        mark={{ line: q.line, name: q.name }}
      />
      <div className={choice.list} role="group" aria-label="Options">
        {q.opts.map((type, i) => {
          const letter = String.fromCharCode(65 + i);
          const t = tone(answer.sel === i, i === q.answer, answer.checked);
          return (
            <button
              key={i}
              type="button"
              className={`${toneStyles.tile} ${toneStyles[t]} ${choice.tile}`}
              aria-pressed={answer.sel === i}
              aria-label={`Option ${letter}: ${q.name}: ${type}${toneLabel(t)}`}
              onClick={() => act({ type: 'select', sel: i })}
            >
              <span className={choice.letter}>{letter}</span>
              <span className={styles.type}>
                {q.name}: {type}
              </span>
              <ToneMark tone={t} />
            </button>
          );
        })}
      </div>
    </>
  );
}
