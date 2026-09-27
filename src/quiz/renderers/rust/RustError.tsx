import type { RustErrorQuestion } from '../../../content';
import { visibleLines } from '../../../lib/code';
import { LinePicker } from '../LinePicker';
import type { RendererProps } from '../types';

/** Tap the line rustc rejects. Line numbers count visible lines only. */
export function RustError({ question: q, answer, act }: RendererProps<RustErrorQuestion>) {
  return <LinePicker lines={visibleLines(q.code)} lang="rust" answer={q.answer} state={answer} act={act} />;
}
