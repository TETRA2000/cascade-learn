import { CodeTokens, type PanelLang } from '../../components/CodePanel';
import type { SessionAction } from '../session';
import { tone, toneLabel } from '../tone';
import { ToneMark } from '../ToneMark';
import type { AnswerState } from '../types';
import styles from './LinePicker.module.css';

interface Props {
  /** Displayed lines; the picked line number is the 1-based index into these. */
  lines: readonly string[];
  lang: PanelLang;
  /** The correct 1-based line. */
  answer: number;
  state: AnswerState;
  act: (action: SessionAction) => void;
}

/** Numbered code lines as tappable buttons (Spot the bug, Spot the error). */
export function LinePicker({ lines, lang, answer, state, act }: Props) {
  return (
    <div className={styles.lines} role="group" aria-label="Code lines">
      {lines.map((line, i) => {
        const n = i + 1;
        const t = tone(state.sel === n, n === answer, state.checked);
        return (
          <button
            key={n}
            type="button"
            className={`${styles.line} ${styles[t]}`}
            aria-pressed={state.sel === n}
            aria-label={`Line ${n}: ${line.trim()}${toneLabel(t)}`}
            onClick={() => act({ type: 'select', sel: n })}
          >
            <span className={styles.num} aria-hidden="true">
              {n}
            </span>
            <span className={styles.code}>
              <CodeTokens line={line} lang={lang} />
            </span>
            <ToneMark tone={t} />
          </button>
        );
      })}
    </div>
  );
}
