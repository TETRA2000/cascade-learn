import { LANG, THROWS_TITLE, type CodeLang } from '../lib/codeLang';
import { XCircleIcon } from './icons';
import styles from './OutputPanel.module.css';

/**
 * What a program does: its stdout, the compiler error, or (TS only) a runtime
 * throw after some output — icon + words, never color alone.
 */
export function OutputPanel({
  lang = 'rust',
  output,
  error,
  thrown,
}: {
  lang?: CodeLang;
  output?: readonly string[];
  error?: string;
  thrown?: string;
}) {
  if (error !== undefined) {
    return (
      <section className={`${styles.panel} ${styles.error}`} aria-label="Compiler error">
        <p className={styles.title}>
          <XCircleIcon size={18} />
          {LANG[lang].errorTitle}
        </p>
        <pre className={styles.body}>{error}</pre>
      </section>
    );
  }
  return (
    <>
      {output !== undefined && (
        <section className={styles.panel} aria-label="Output">
          <p className={styles.title}>Output</p>
          <pre className={styles.body}>{output.join('\n')}</pre>
        </section>
      )}
      {thrown !== undefined && (
        <section className={`${styles.panel} ${styles.error}`} aria-label="Runtime error">
          <p className={styles.title}>
            <XCircleIcon size={18} />
            {THROWS_TITLE}
          </p>
          <pre className={styles.body}>{thrown}</pre>
        </section>
      )}
    </>
  );
}
