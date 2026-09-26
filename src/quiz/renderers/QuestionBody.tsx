import type { Question } from '../../content';
import { CssQuestionBody } from './css/CssQuestionBody';
import type { RendererProps } from './types';

/** The middle of the quiz screen for one question. */
export function QuestionBody(props: RendererProps<Question>) {
  return <CssQuestionBody {...props} />;
}
