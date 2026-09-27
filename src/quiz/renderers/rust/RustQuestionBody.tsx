import type { RustQuestion } from '../../../content';
import type { RendererProps } from '../types';
import { RustCompiles } from './RustCompiles';
import { RustError } from './RustError';
import { RustFix } from './RustFix';
import { RustPredict } from './RustPredict';
import { RustType } from './RustType';

export function RustQuestionBody({ question, answer, act }: RendererProps<RustQuestion>) {
  switch (question.type) {
    case 'rs-predict':
      return <RustPredict question={question} answer={answer} act={act} />;
    case 'rs-compiles':
      return <RustCompiles question={question} answer={answer} act={act} />;
    case 'rs-fix':
      return <RustFix question={question} answer={answer} act={act} />;
    case 'rs-error':
      return <RustError question={question} answer={answer} act={act} />;
    case 'rs-type':
      return <RustType question={question} answer={answer} act={act} />;
    default:
      return null; // rs-pairs, rs-build: see the next renderer commit
  }
}
