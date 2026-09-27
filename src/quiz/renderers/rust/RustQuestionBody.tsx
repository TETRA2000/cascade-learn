import type { RustQuestion } from '../../../content';
import type { RendererProps } from '../types';
import { RustBuild } from './RustBuild';
import { RustCompiles } from './RustCompiles';
import { RustError } from './RustError';
import { RustFix } from './RustFix';
import { RustPairs } from './RustPairs';
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
    case 'rs-pairs':
      return <RustPairs question={question} answer={answer} act={act} />;
    case 'rs-build':
      return <RustBuild question={question} answer={answer} act={act} />;
  }
}
