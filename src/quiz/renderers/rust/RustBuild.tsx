import type { RustBuildQuestion } from '../../../content';
import { CodeTokens } from '../../../components/CodePanel';
import { OutputPanel } from '../../../components/OutputPanel';
import { isHiddenLine } from '../../../lib/code';
import type { RendererProps } from '../types';
import { SlotButton, WordBank } from '../WordBank';
import styles from './RustBuild.module.css';

/** Fill inline blanks from a word bank. After Check, show what the finished program prints. */
export function RustBuild({ question: q, answer, act }: RendererProps<RustBuildQuestion>) {
  const words = answer.slots.map((ci) => (ci === null ? null : (q.bank[ci] ?? null)));
  return (
    <>
      <div className={styles.code} role="group" aria-label="Rust code">
        {q.code.map((line, i) => {
          if (typeof line === 'string') {
            if (isHiddenLine(line)) return null;
            return (
              <div key={i} className={styles.line}>
                <CodeTokens line={line} lang="rust" />
              </div>
            );
          }
          return (
            <div key={i} className={styles.line}>
              {line.map((seg, j) =>
                typeof seg === 'string' ? (
                  <CodeTokens key={j} line={seg} lang="rust" />
                ) : (
                  <SlotButton
                    key={j}
                    n={seg.slot + 1}
                    word={words[seg.slot] ?? null}
                    checked={answer.checked}
                    onClear={() => act({ type: 'clearSlot', slot: seg.slot })}
                  />
                ),
              )}
            </div>
          );
        })}
      </div>
      <WordBank bank={q.bank} slots={answer.slots} checked={answer.checked} act={act} />
      {answer.checked && answer.ok && q.output && <OutputPanel output={q.output} />}
    </>
  );
}
