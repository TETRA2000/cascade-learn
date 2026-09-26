import { highlightLine } from '../lib/highlight';
import styles from './CodePanel.module.css';

/** One syntax-colored line of CSS (no wrapper). `§` lines are HTML. */
export function CodeTokens({ line }: { line: string }) {
  return (
    <>
      {highlightLine(line).map((t, j) => (
        <span key={j} className={styles[t.kind]}>
          {t.text}
        </span>
      ))}
    </>
  );
}

/** Dark editor panel with syntax colors. */
export function CodePanel({ lines, label }: { lines: readonly string[]; label?: string }) {
  return (
    <pre className={styles.panel} aria-label={label}>
      <code>
        {lines.map((line, i) => (
          <span key={i} className={styles.line}>
            <CodeTokens line={line} />
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  );
}
