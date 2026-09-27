import { useId } from 'react';
import { langOf, type CodeQ } from '../../../content';
import { CodePanel } from '../../../components/CodePanel';
import { visibleLines } from '../../../lib/code';
import { tone, toneLabel } from '../../tone';
import { ToneMark } from '../../ToneMark';
import toneStyles from '../../tone.module.css';
import type { RendererProps } from '../types';
import choice from './choice.module.css';
import styles from './CodeCompiles.module.css';

/**
 * Two near-identical snippets; pick the one the compiler accepts. Each tile is described by its code —
 * as plain text, not the syntax-highlighted markup: nested inline spans lose the whitespace between
 * tokens when an accessible name/description is computed from them, so the highlighted `CodePanel`
 * is hidden from assistive tech and a flat-text twin carries the description instead.
 */
export function CodeCompiles({ question: q, answer, act }: RendererProps<CodeQ<'compiles'>>) {
  const lang = langOf(q);
  const idBase = useId();
  return (
    <div className={choice.list} role="group" aria-label="Snippets">
      {(['a', 'b'] as const).map((key) => {
        const letter = key.toUpperCase();
        const codeId = `${idBase}-${key}`;
        const t = tone(answer.sel === key, key === q.answer, answer.checked);
        return (
          <button
            key={key}
            type="button"
            className={`${toneStyles.tile} ${toneStyles[t]} ${choice.tile} ${styles.tile}`}
            aria-pressed={answer.sel === key}
            aria-label={`Snippet ${letter}${toneLabel(t)}`}
            aria-describedby={codeId}
            onClick={() => act({ type: 'select', sel: key })}
          >
            <span className={choice.letter}>{letter}</span>
            <span className={styles.code} aria-hidden="true">
              <CodePanel lines={q[key]} lang={lang} />
            </span>
            <span id={codeId} className="sr-only">
              {visibleLines(q[key]).join(' ')}
            </span>
            <ToneMark tone={t} />
          </button>
        );
      })}
    </div>
  );
}
