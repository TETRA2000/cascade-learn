import { LANG, type CodeLang } from '../lib/codeLang';
import { highlightLine } from '../lib/highlight';
import { BLANK, findWord, visibleLines } from '../lib/code';
import styles from './CodePanel.module.css';

/** 'css' plus every code course's language. */
export type PanelLang = 'css' | CodeLang;

/** One syntax-colored line (no wrapper). In CSS, `§` lines are HTML. */
export function CodeTokens({ line, lang = 'css' }: { line: string; lang?: PanelLang }) {
  const tokens = lang === 'css' ? highlightLine(line) : LANG[lang].highlight(line);
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

/** Dark editor panel with syntax colors. Non-CSS panels hide `# ` lines and number the rest. */
export function CodePanel({
  lines,
  label,
  lang = 'css',
  id,
  blank,
  mark,
}: {
  lines: readonly string[];
  label?: string;
  lang?: PanelLang;
  id?: string;
  /** *-type: text shown in the `___` blank (the blank itself while empty). */
  blank?: string;
  /** ts-infer: the first whole-word `name` on visible `line` (1-based) gets a dotted underline and a "hover" tag. */
  mark?: { line: number; name: string };
}) {
  const numbered = lang !== 'css';
  const shown = numbered ? visibleLines(lines) : lines;
  return (
    <pre id={id} className={numbered ? `${styles.panel} ${styles.numbered}` : styles.panel} aria-label={label}>
      <code>
        {shown.map((line, i) => (
          <span key={i} className={styles.line}>
            {numbered && (
              <span className={styles.gutter} aria-hidden="true">
                {i + 1}
              </span>
            )}
            <LineContent line={line} lang={lang} blank={blank} mark={mark?.line === i + 1 ? mark.name : undefined} />
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  );
}

function LineContent({ line, lang, blank, mark }: { line: string; lang: PanelLang; blank?: string; mark?: string }) {
  const at = blank === undefined ? -1 : line.indexOf(BLANK);
  if (at !== -1) {
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
  const hit = mark === undefined ? -1 : findWord(line, mark);
  if (mark === undefined || hit === -1) return <CodeTokens line={line} lang={lang} />;
  // The panel's aria-label names the marked word and line, so the visual tag is hidden from assistive tech.
  return (
    <>
      <CodeTokens line={line.slice(0, hit)} lang={lang} />
      <mark className={styles.hovered}>
        <CodeTokens line={mark} lang={lang} />
      </mark>
      <span className={styles.hoverTag} aria-hidden="true">
        hover
      </span>
      <CodeTokens line={line.slice(hit + mark.length)} lang={lang} />
    </>
  );
}
