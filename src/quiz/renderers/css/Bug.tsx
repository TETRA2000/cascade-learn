import type { BugQuestion } from '../../../content';
import { CssBox } from '../../../components/CssBox';
import { LinePicker } from '../LinePicker';
import type { RendererProps } from '../types';
import preview from './preview.module.css';

/** Compare expected vs actual, then tap the line that silently fails. */
export function Bug({ question: q, answer, act }: RendererProps<BugQuestion>) {
  return (
    <>
      <div className={preview.pair}>
        {(
          [
            ['Expected', q.expected],
            ['Actual', q.actual],
          ] as const
        ).map(([label, shot]) => (
          <figure key={label} className={preview.figure}>
            <figcaption className={preview.caption}>{label}</figcaption>
            <CssBox css={q.stage}>
              <CssBox css={shot.s}>{shot.t}</CssBox>
            </CssBox>
          </figure>
        ))}
      </div>
      <LinePicker lines={q.code} lang="css" answer={q.answer} state={answer} act={act} />
    </>
  );
}
