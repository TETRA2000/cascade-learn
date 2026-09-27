import { langOf, type CodeQ } from '../../../content';
import { visibleLines } from '../../../lib/code';
import { LinePicker } from '../LinePicker';
import type { RendererProps } from '../types';

/** Tap the line the compiler rejects. Line numbers count visible lines only. */
export function CodeError({ question: q, answer, act }: RendererProps<CodeQ<'error'>>) {
  return <LinePicker lines={visibleLines(q.code)} lang={langOf(q)} answer={q.answer} state={answer} act={act} />;
}
