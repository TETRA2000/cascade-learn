import { highlightLine } from '../lib/highlight';
import styles from './CodePanel.module.css';

/** Dark editor panel with syntax colors. `§` lines are HTML. */
export function CodePanel({ lines, label }: { lines: readonly string[]; label?: string }) {
  return (
    <pre className={styles.panel} aria-label={label}>
      <code>
        {lines.map((line, i) => (
          <span key={i} className={styles.line}>
            {highlightLine(line).map((t, j) => (
              <span key={j} className={styles[t.kind]}>
                {t.text}
              </span>
            ))}
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  );
}
