import type { ReactElement } from 'react';
import type { CodeQuestion } from '../../../content';
import type { RendererProps } from '../types';
import { CodeBuild } from './CodeBuild';
import { CodeCompiles } from './CodeCompiles';
import { CodeError } from './CodeError';
import { CodeFix } from './CodeFix';
import { CodeInfer } from './CodeInfer';
import { CodePairs } from './CodePairs';
import { CodePredict } from './CodePredict';
import { CodeType } from './CodeType';

export function CodeQuestionBody({ question, answer, act }: RendererProps<CodeQuestion>): ReactElement {
  switch (question.type) {
    case 'rs-predict':
    case 'ts-predict':
      return <CodePredict question={question} answer={answer} act={act} />;
    case 'ts-infer':
      return <CodeInfer question={question} answer={answer} act={act} />;
    case 'rs-compiles':
    case 'ts-compiles':
      return <CodeCompiles question={question} answer={answer} act={act} />;
    case 'rs-fix':
    case 'ts-fix':
      return <CodeFix question={question} answer={answer} act={act} />;
    case 'rs-error':
    case 'ts-error':
      return <CodeError question={question} answer={answer} act={act} />;
    case 'rs-type':
    case 'ts-type':
      return <CodeType question={question} answer={answer} act={act} />;
    case 'rs-pairs':
    case 'ts-pairs':
      return <CodePairs question={question} answer={answer} act={act} />;
    case 'rs-build':
    case 'ts-build':
      return <CodeBuild question={question} answer={answer} act={act} />;
  }
}
