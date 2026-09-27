import { useEffect, useId, useRef, type Dispatch } from 'react';
import { isCodeDemo, unitByKey, type Course } from '../content';
import { Button } from '../components/Button';
import { CodePanel } from '../components/CodePanel';
import { CssBox } from '../components/CssBox';
import { BulbIcon, CloseIcon } from '../components/icons';
import { OutputPanel } from '../components/OutputPanel';
import { ProgressBar } from '../components/ProgressBar';
import { RichText } from '../components/RichText';
import { buildDemo, buildRustDemo, type DemoControl, type DemoView, type RustDemoView } from '../lib/demo';
import type { Action } from '../state/app';
import styles from './Learn.module.css';

interface Props {
  course: Course;
  unitKey: string;
  card: number;
  selection: number[];
  dispatch: Dispatch<Action>;
}

export function Learn({ course, unitKey, card: cardIndex, selection, dispatch }: Props) {
  const unit = unitByKey(course, unitKey);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // New card: start at the top and move focus to its title so screen readers
  // announce it (and focus isn't stranded on a button that just got disabled).
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    headingRef.current?.focus({ preventScroll: true });
  }, [unitKey, cardIndex]);

  if (!unit) return null;
  const total = unit.cards.length;
  const card = unit.cards[cardIndex]!;
  const first = cardIndex === 0;
  const last = cardIndex === total - 1;
  const pick = (control: number, option: number) => dispatch({ type: 'pickOption', control, option });

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button type="button" className={styles.close} aria-label="Close lesson" onClick={() => dispatch({ type: 'goHome' })}>
          <CloseIcon />
        </button>
        <ProgressBar tone="learn" label="Lesson progress" value={((cardIndex + 1) / total) * 100} />
        <span className={styles.position}>
          <span className="sr-only">Card </span>
          {cardIndex + 1} / {total}
        </span>
      </header>

      <div className={styles.titleBlock}>
        <span className={styles.unitChip}>{unit.name}</span>
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
          {card.title}
        </h1>
      </div>

      <main ref={mainRef} className={styles.main}>
        <p className={styles.body}>
          <RichText text={card.body} />
        </p>

        {card.demo &&
          (isCodeDemo(card.demo) ? (
            <RustPlayground view={buildRustDemo(card.demo, selection)} onPick={pick} />
          ) : (
            <Playground view={buildDemo(card.demo, selection)} onPick={pick} />
          ))}

        {card.tip && (
          <aside className={styles.tip} aria-label="Key idea">
            <BulbIcon className={styles.tipIcon} />
            <div className={styles.tipText}>
              <span className={styles.tipLabel} aria-hidden="true">
                Key idea
              </span>
              <p>
                <RichText text={card.tip} />
              </p>
            </div>
          </aside>
        )}
      </main>

      <footer className={styles.footer}>
        <Button
          variant="secondary"
          className={styles.left}
          disabled={first && !last}
          onClick={() => (last ? dispatch({ type: 'finishUnit', practice: false }) : dispatch({ type: 'gotoCard', card: cardIndex - 1 }))}
        >
          {last ? 'Done' : 'Back'}
        </Button>
        <Button
          className={styles.right}
          onClick={() => (last ? dispatch({ type: 'finishUnit', practice: true }) : dispatch({ type: 'gotoCard', card: cardIndex + 1 }))}
        >
          {last ? 'Practice this' : 'Next'}
        </Button>
      </footer>
    </div>
  );
}

function Playground({ view, onPick }: { view: DemoView; onPick: (control: number, option: number) => void }) {
  return (
    <section className={styles.playground} aria-label="Playground">
      <CssBox className={styles.stage} css={view.stage} data-testid="demo-stage">
        {view.children.map((c, i) => (
          <CssBox key={i} css={c.wrap}>
            <CssBox css={c.css}>{c.text}</CssBox>
          </CssBox>
        ))}
      </CssBox>

      {view.legend.length > 0 && (
        <ul className={styles.legend} aria-label="Legend">
          {view.legend.map((l) => (
            <li key={l.l}>
              <CssBox as="span" css={l.sw} aria-hidden="true" />
              {l.l}
            </li>
          ))}
        </ul>
      )}

      {view.caption !== null && (
        <p className={styles.caption} aria-live="polite">
          <RichText text={view.caption} />
        </p>
      )}

      <CodePanel lines={view.code} label="CSS" />

      <DemoControls controls={view.controls} onPick={onPick} />
    </section>
  );
}

function RustPlayground({ view, onPick }: { view: RustDemoView; onPick: (control: number, option: number) => void }) {
  return (
    <section className={styles.playground} aria-label="Playground">
      <CodePanel lines={view.code} lang="rust" label="Rust code" />
      <div aria-live="polite">
        {(view.output !== undefined || view.error !== undefined) && <OutputPanel output={view.output} error={view.error} />}
      </div>
      {view.caption !== null && (
        <p className={styles.caption} aria-live="polite">
          <RichText text={view.caption} />
        </p>
      )}
      <DemoControls controls={view.controls} onPick={onPick} />
    </section>
  );
}

/** One chip group per knob (or the single choice). */
function DemoControls({ controls, onPick }: { controls: DemoControl[]; onPick: (control: number, option: number) => void }) {
  const idBase = useId();
  return (
    <>
      {controls.map((control, ci) => {
        const labelId = `${idBase}-knob-${ci}`;
        return (
          <div key={control.label} className={styles.knob}>
            <span id={labelId} className={styles.knobLabel}>
              {control.label}
            </span>
            <div role="group" aria-labelledby={labelId} className={styles.chips}>
              {control.options.map((o, oi) => (
                <button
                  key={o.label}
                  type="button"
                  className={styles.chip}
                  aria-pressed={o.active}
                  onClick={() => onPick(ci, oi)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
