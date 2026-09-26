import type { BugQuestion } from '../../../content';
import { CodeTokens } from '../../../components/CodePanel';
import { CssBox } from '../../../components/CssBox';
import { tone, toneLabel } from '../../tone';
import { ToneMark } from '../../ToneMark';
import type { RendererProps } from '../types';
import preview from './preview.module.css';
import styles from './Bug.module.css';

/** Compare expected vs actual, then tap the line that silently fails. */
export function Bug({ question: q, answer, act }: RendererProps<BugQuestion>) {
  return (
    <>
      <div className={preview.pair}>
        {(
          [
            ['Expected', q.expected],
            ['Actual', q.actual],
          ] as const
        ).map(([label, shot]) => (
          <figure key={label} className={preview.figure}>
            <figcaption className={preview.caption}>{label}</figcaption>
            <CssBox css={q.stage}>
              <CssBox css={shot.s}>{shot.t}</CssBox>
            </CssBox>
          </figure>
        ))}
      </div>
      <div className={styles.lines} role="group" aria-label="Code lines">
        {q.code.map((line, i) => {
          const n = i + 1;
          const t = tone(answer.sel === n, n === q.answer, answer.checked);
          return (
            <button
              key={n}
              type="button"
              className={`${styles.line} ${styles[t]}`}
              aria-pressed={answer.sel === n}
              aria-label={`Line ${n}: ${line.trim()}${toneLabel(t)}`}
              onClick={() => act({ type: 'select', sel: n })}
            >
              <span className={styles.num} aria-hidden="true">
                {n}
              </span>
              <span className={styles.code}>
                <CodeTokens line={line} />
              </span>
              <ToneMark tone={t} />
            </button>
          );
        })}
      </div>
    </>
  );
}
