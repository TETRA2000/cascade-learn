import type { Question } from '../../content';
import { Pairs } from './Pairs';
import { Predict } from './Predict';
import { Versus } from './Versus';
import type { RendererProps } from './types';

/** The middle of the quiz screen for one question. */
export function QuestionBody({ question, answer, act }: RendererProps<Question>) {
  switch (question.type) {
    case 'predict':
      return <Predict question={question} answer={answer} act={act} />;
    case 'pairs':
      return <Pairs question={question} answer={answer} act={act} />;
    case 'versus':
      return <Versus question={question} answer={answer} act={act} />;
    default:
      return null; // remaining types are added in Tasks 4–8
  }
}
