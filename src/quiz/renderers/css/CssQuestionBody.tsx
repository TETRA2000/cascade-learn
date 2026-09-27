import type { ReactElement } from 'react';
import type { CssQuestion } from '../../../content';
import type { RendererProps } from '../types';
import { Bug } from './Bug';
import { Build } from './Build';
import { Pairs } from './Pairs';
import { Predict } from './Predict';
import { Tune } from './Tune';
import { TypeValue } from './TypeValue';
import { Versus } from './Versus';

export function CssQuestionBody({ question, answer, act }: RendererProps<CssQuestion>): ReactElement {
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
