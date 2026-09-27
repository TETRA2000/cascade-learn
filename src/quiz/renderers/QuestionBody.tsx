import { isRustQuestion, type Question } from '../../content';
import { CssQuestionBody } from './css/CssQuestionBody';
import { RustQuestionBody } from './rust/RustQuestionBody';
import type { RendererProps } from './types';

/** The middle of the quiz screen for one question. */
export function QuestionBody({ question, answer, act }: RendererProps<Question>) {
  if (isRustQuestion(question)) return <RustQuestionBody question={question} answer={answer} act={act} />;
  return <CssQuestionBody question={question} answer={answer} act={act} />;
}
