import { useId } from 'react';
import { langOf, type CodeQ } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { LANG } from '../../../lib/codeLang';
import { TOKEN_MAX_LENGTH } from '../../../lib/code';
import type { RendererProps } from '../types';
import styles from './CodeType.module.css';

/** Free recall: type the missing token. The code shows it in place as you type (as text, never markup). */
export function CodeType({ question: q, answer, act }: RendererProps<CodeQ<'type'>>) {
  const lang = langOf(q);
  const inputId = useId();
  return (
    <>
      <CodePanel lines={q.code} lang={lang} label={LANG[lang].codeLabel} blank={answer.val} />
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          Missing token
        </label>
        <input
          id={inputId}
          className={styles.input}
          type="text"
          value={answer.val}
          maxLength={TOKEN_MAX_LENGTH}
          disabled={answer.checked}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => act({ type: 'input', val: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              act({ type: 'check' });
            }
          }}
        />
      </div>
      <p className={styles.help}>No options this time — type it from memory. Press Enter to check.</p>
    </>
  );
}
