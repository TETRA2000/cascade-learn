import type { RustFixQuestion } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { OutputPanel } from '../../../components/OutputPanel';
import { parseDiff } from '../../../lib/code';
import { tone, toneLabel } from '../../tone';
import { ToneMark } from '../../ToneMark';
import toneStyles from '../../tone.module.css';
import type { RendererProps } from '../types';
import choice from './choice.module.css';
import styles from './RustFix.module.css';

const quote = (lines: string[]) => `“${lines.map((l) => l.trim()).join(' ')}”`;

/** Read rustc's complaint, then pick the change that fixes it. Diff signs are glyphs, not just color. */
export function RustFix({ question: q, answer, act }: RendererProps<RustFixQuestion>) {
  return (
    <>
      <OutputPanel error={q.error} />
      <CodePanel lines={q.code} lang="rust" label="Rust code" />
      <div className={choice.list} role="group" aria-label="Fixes">
        {q.opts.map((o, i) => {
          const letter = String.fromCharCode(65 + i);
          const t = tone(answer.sel === i, i === q.answer, answer.checked);
          const { remove, add } = parseDiff(o.diff);
          return (
            <button
              key={i}
              type="button"
              className={`${toneStyles.tile} ${toneStyles[t]} ${choice.tile}`}
              aria-pressed={answer.sel === i}
              aria-label={`Option ${letter}: change ${quote(remove)} to ${quote(add)}${toneLabel(t)}`}
              onClick={() => act({ type: 'select', sel: i })}
            >
              <span className={choice.letter}>{letter}</span>
              <span className={styles.diff}>
                {remove.map((line, j) => (
                  <span key={`-${j}`} className={styles.del}>
                    <span className={styles.sign}>−</span>
                    {line.trim()}
                  </span>
                ))}
                {add.map((line, j) => (
                  <span key={`+${j}`} className={styles.add}>
                    <span className={styles.sign}>+</span>
                    {line.trim()}
                  </span>
                ))}
              </span>
              <ToneMark tone={t} />
            </button>
          );
        })}
      </div>
    </>
  );
}
