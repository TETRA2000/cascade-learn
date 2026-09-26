import { splitInlineCode } from '../lib/inlineCode';
import styles from './RichText.module.css';

/** Prose where `backtick` segments render as inline code. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {splitInlineCode(text).map((p, i) =>
        p.code ? (
          <code key={i} className={styles.code}>
            {p.text}
          </code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}
