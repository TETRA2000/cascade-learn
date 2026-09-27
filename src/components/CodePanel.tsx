import { highlightLine } from '../lib/highlight';
import { highlightRust } from '../lib/highlightRust';
import { visibleLines } from '../lib/rustCode';
import styles from './CodePanel.module.css';

export type CodeLang = 'css' | 'rust';

/** One syntax-colored line (no wrapper). In CSS, `§` lines are HTML. */
export function CodeTokens({ line, lang = 'css' }: { line: string; lang?: CodeLang }) {
  const tokens = lang === 'rust' ? highlightRust(line) : highlightLine(line);
  return (
    <>
      {tokens.map((t, j) => (
        <span key={j} className={styles[t.kind]}>
          {t.text}
        </span>
      ))}
    </>
  );
}

/** Dark editor panel with syntax colors. Rust panels hide `# ` lines and number the rest. */
export function CodePanel({ lines, label, lang = 'css', id }: { lines: readonly string[]; label?: string; lang?: CodeLang; id?: string }) {
  const rust = lang === 'rust';
  const shown = rust ? visibleLines(lines) : lines;
  return (
    <pre id={id} className={styles.panel} aria-label={label}>
      <code>
        {shown.map((line, i) => (
          <span key={i} className={styles.line}>
            {rust && (
              <span className={styles.gutter} aria-hidden="true">
                {i + 1}
              </span>
            )}
            <CodeTokens line={line} lang={lang} />
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  );
}
