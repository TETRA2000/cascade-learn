import type { RustQuestion } from '../../../content';
import type { RendererProps } from '../types';
import { RustCompiles } from './RustCompiles';
import { RustFix } from './RustFix';
import { RustPredict } from './RustPredict';

export function RustQuestionBody({ question, answer, act }: RendererProps<RustQuestion>) {
  switch (question.type) {
    case 'rs-predict':
      return <RustPredict question={question} answer={answer} act={act} />;
    case 'rs-compiles':
      return <RustCompiles question={question} answer={answer} act={act} />;
    case 'rs-fix':
      return <RustFix question={question} answer={answer} act={act} />;
    default:
      return null; // rs-pairs, rs-build, rs-error, rs-type: see the following renderer commits
  }
}
