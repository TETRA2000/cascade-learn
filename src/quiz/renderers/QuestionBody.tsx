import { isCodeQuestion, type Question } from '../../content';
import { CodeQuestionBody } from './code/CodeQuestionBody';
import { CssQuestionBody } from './css/CssQuestionBody';
import type { RendererProps } from './types';

/** The middle of the quiz screen for one question. */
export function QuestionBody({ question, answer, act }: RendererProps<Question>) {
  if (isCodeQuestion(question)) return <CodeQuestionBody question={question} answer={answer} act={act} />;
  return <CssQuestionBody question={question} answer={answer} act={act} />;
}
