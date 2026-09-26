import { useId } from 'react';
import type { TypeQuestion } from '../../../content';
import { CssBox } from '../../../components/CssBox';
import { typePreviewCss } from '../../previews';
import type { RendererProps } from '../types';
import preview from './preview.module.css';
import styles from './TypeValue.module.css';

/** Free recall: type the value; the preview applies the sanitized keyword live. */
export function TypeValue({ question: q, answer, act }: RendererProps<TypeQuestion>) {
  const inputId = useId();
  return (
    <>
      <figure className={preview.figure}>
        <figcaption className={preview.caption}>Live preview</figcaption>
        <div className={styles.preview}>
          <CssBox as="span" css={typePreviewCss(q, answer.val)} data-testid="type-preview">
            {q.text}
          </CssBox>
        </div>
      </figure>
      <div className={styles.code}>
        <div>
          <span className={styles.sel}>{q.sel}</span> {'{'}
        </div>
        <div className={styles.inputLine}>
          <label htmlFor={inputId} className={styles.prop}>
            {q.prop}
          </label>
          :
          <input
            id={inputId}
            className={styles.input}
            type="text"
            value={answer.val}
            disabled={answer.checked}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="value"
            onChange={(e) => act({ type: 'input', val: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                act({ type: 'check' });
              }
            }}
          />
          ;
        </div>
        <div>{'}'}</div>
      </div>
      <p className={styles.help}>No options this time — type it from memory. Press Enter to check.</p>
    </>
  );
}
