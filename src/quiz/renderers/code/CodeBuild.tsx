import { langOf, type CodeQ } from '../../../content';
import { CodeTokens } from '../../../components/CodePanel';
import { OutputPanel } from '../../../components/OutputPanel';
import { LANG } from '../../../lib/codeLang';
import { isHiddenLine } from '../../../lib/code';
import type { RendererProps } from '../types';
import { SlotButton, WordBank } from '../WordBank';
import styles from './CodeBuild.module.css';

/** Fill inline blanks from a word bank. After Check, show what the finished program prints. */
export function CodeBuild({ question: q, answer, act }: RendererProps<CodeQ<'build'>>) {
  const lang = langOf(q);
  const words = answer.slots.map((ci) => (ci === null ? null : (q.bank[ci] ?? null)));
  return (
    <>
      <div className={styles.code} role="group" aria-label={LANG[lang].codeLabel}>
        {q.code.map((line, i) => {
          if (typeof line === 'string') {
            if (isHiddenLine(line)) return null;
            return (
              <div key={i} className={styles.line}>
                <CodeTokens line={line} lang={lang} />
              </div>
            );
          }
          return (
            <div key={i} className={styles.line}>
              {line.map((seg, j) =>
                typeof seg === 'string' ? (
                  <CodeTokens key={j} line={seg} lang={lang} />
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
      {answer.checked && answer.ok && q.output && <OutputPanel lang={lang} output={q.output} />}
    </>
  );
}
