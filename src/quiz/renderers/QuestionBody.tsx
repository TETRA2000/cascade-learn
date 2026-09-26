import type { Question } from '../../content';
import { Bug } from './Bug';
import { Build } from './Build';
import { Pairs } from './Pairs';
import { Predict } from './Predict';
import { Tune } from './Tune';
import { TypeValue } from './TypeValue';
import type { RendererProps } from './types';
import { Versus } from './Versus';

/** The middle of the quiz screen for one question. */
export function QuestionBody({ question, answer, act }: RendererProps<Question>) {
  switch (question.type) {
    case 'predict':
      return <Predict question={question} answer={answer} act={act} />;
    case 'pairs':
      return <Pairs question={question} answer={answer} act={act} />;
    case 'versus':
      return <Versus question={question} answer={answer} act={act} />;
    case 'build':
      return <Build question={question} answer={answer} act={act} />;
    case 'tune':
      return <Tune question={question} answer={answer} act={act} />;
    case 'bug':
      return <Bug question={question} answer={answer} act={act} />;
    case 'type':
      return <TypeValue question={question} answer={answer} act={act} />;
  }
}
