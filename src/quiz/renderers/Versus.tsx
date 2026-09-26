import type { VersusQuestion } from '../../content';
import { CodePanel } from '../../components/CodePanel';
import { CssBox } from '../../components/CssBox';
import { tone, toneLabel } from '../tone';
import { ToneMark } from '../ToneMark';
import toneStyles from '../tone.module.css';
import type { RendererProps } from './types';
import styles from './Versus.module.css';

/** Pick the color the cascade produces; the reveal shows each rule's specificity. */
export function Versus({ question: q, answer, act }: RendererProps<VersusQuestion>) {
  const big = q.opts.length <= 2;
  return (
    <>
      <CodePanel lines={q.code} label="CSS" />
      <div className={styles.options} style={{ gridTemplateColumns: `repeat(${q.opts.length}, minmax(0, 1fr))` }}>
        {q.opts.map((color) => {
          const t = tone(answer.sel === color, color === q.answer, answer.checked);
          return (
            <button
              key={color}
              type="button"
              className={`${toneStyles.tile} ${toneStyles[t]} ${styles.option}`}
              aria-pressed={answer.sel === color}
              aria-label={`${color}${toneLabel(t)}`}
              onClick={() => act({ type: 'select', sel: color })}
            >
              <CssBox as="span" className={big ? styles.helloBig : styles.hello} css={`color:${color}`}>
                Hello
              </CssBox>
              <span className={styles.name}>{color}</span>
              <ToneMark tone={t} />
            </button>
          );
        })}
      </div>
      {answer.checked && (
        <table className={styles.scores}>
          <caption className="sr-only">Specificity scores</caption>
          <thead>
            <tr>
              <th scope="col">Rule</th>
              <th scope="col">ID · Class · Tag</th>
              <th scope="col">
                <span className="sr-only">Result</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {q.scores.map((r) => (
              <tr key={r.sel}>
                <td>{r.sel}</td>
                <td>{r.score}</td>
                <td>{r.win && <span className={styles.wins}>wins</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
