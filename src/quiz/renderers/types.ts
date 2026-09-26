import type { Question } from '../../content';
import type { SessionAction } from '../session';
import type { AnswerState } from '../types';

export interface RendererProps<Q extends Question> {
  question: Q;
  answer: AnswerState;
  act: (action: SessionAction) => void;
}
