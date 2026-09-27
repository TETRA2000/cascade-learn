import { isRustQuestion, type Question } from '../../content';
import { CssQuestionBody } from './css/CssQuestionBody';
import type { RendererProps } from './types';

/** The middle of the quiz screen for one question. */
export function QuestionBody({ question, answer, act }: RendererProps<Question>) {
  if (isRustQuestion(question)) return null; // RustQuestionBody arrives with the Rust renderers
  return <CssQuestionBody question={question} answer={answer} act={act} />;
}
