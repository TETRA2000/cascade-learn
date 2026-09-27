import { XCircleIcon } from './icons';
import styles from './OutputPanel.module.css';

/** What a Rust program does: its stdout, or the compile error (icon + words, never color alone). */
export function OutputPanel({ output, error }: { output?: readonly string[]; error?: string }) {
  if (error !== undefined) {
    return (
      <section className={`${styles.panel} ${styles.error}`} aria-label="Compiler error">
        <p className={styles.title}>
          <XCircleIcon size={18} />
          Doesn’t compile
        </p>
        <pre className={styles.body}>{error}</pre>
      </section>
    );
  }
  return (
    <section className={styles.panel} aria-label="Output">
      <p className={styles.title}>Output</p>
      <pre className={styles.body}>{(output ?? []).join('\n')}</pre>
    </section>
  );
}
