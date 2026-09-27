import { useId } from 'react';
import type { RustTypeQuestion } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { TOKEN_MAX_LENGTH } from '../../../lib/code';
import type { RendererProps } from '../types';
import styles from './RustType.module.css';

/** Free recall: type the missing token. The code shows it in place as you type (as text, never markup). */
export function RustType({ question: q, answer, act }: RendererProps<RustTypeQuestion>) {
  const inputId = useId();
  return (
    <>
      <CodePanel lines={q.code} lang="rust" label="Rust code" blank={answer.val} />
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
