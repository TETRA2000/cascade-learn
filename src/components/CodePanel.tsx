import { highlightLine } from '../lib/highlight';
import { highlightRust } from '../lib/highlightRust';
import { BLANK, visibleLines } from '../lib/rustCode';
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
export function CodePanel({
  lines,
  label,
  lang = 'css',
  id,
  blank,
}: {
  lines: readonly string[];
  label?: string;
  lang?: CodeLang;
  id?: string;
  /** rs-type: text shown in the `___` blank (the blank itself while empty). */
  blank?: string;
}) {
  const rust = lang === 'rust';
  const shown = rust ? visibleLines(lines) : lines;
  return (
    <pre id={id} className={rust ? `${styles.panel} ${styles.numbered}` : styles.panel} aria-label={label}>
      <code>
        {shown.map((line, i) => (
          <span key={i} className={styles.line}>
            {rust && (
              <span className={styles.gutter} aria-hidden="true">
                {i + 1}
              </span>
            )}
            <LineContent line={line} lang={lang} blank={blank} />
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  );
}

function LineContent({ line, lang, blank }: { line: string; lang: CodeLang; blank?: string }) {
  const at = blank === undefined ? -1 : line.indexOf(BLANK);
  if (at === -1) return <CodeTokens line={line} lang={lang} />;
  return (
    <>
      <CodeTokens line={line.slice(0, at)} lang={lang} />
      <mark className={styles.blank} data-testid="code-blank">
        {blank || BLANK}
      </mark>
      <CodeTokens line={line.slice(at + BLANK.length)} lang={lang} />
    </>
  );
}
