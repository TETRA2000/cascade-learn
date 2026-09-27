import { langOf, type CodeQ } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { LANG } from '../../../lib/codeLang';
import { tone, toneLabel } from '../../tone';
import { ToneMark } from '../../ToneMark';
import toneStyles from '../../tone.module.css';
import type { RendererProps } from '../types';
import choice from './choice.module.css';
import styles from './CodePredict.module.css';

/** Read the code, pick what it prints — or that it doesn't compile, or (TS) throws at runtime. */
export function CodePredict({ question: q, answer, act }: RendererProps<CodeQ<'predict'>>) {
  const lang = langOf(q);
  return (
    <>
      <CodePanel lines={q.code} lang={lang} label={LANG[lang].codeLabel} />
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
              {/* `error` and `throws` share the bold, non-code style: they're outcomes, not output. */}
              <span className={o.kind === 'output' ? styles.output : styles.error}>{o.text}</span>
              <ToneMark tone={t} />
            </button>
          );
        })}
      </div>
    </>
  );
}
