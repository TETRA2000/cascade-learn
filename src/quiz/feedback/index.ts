// Feedback sheet copy, split by course family.
import { isCodeQuestion, type Question } from '../../content';
import type { AnswerState } from '../types';
import { codeFeedback } from './code';
import { cssFeedback } from './css';
import { PRAISE, type FeedbackText } from './shared';

export type { FeedbackText } from './shared';

/** `index` is the question's position in the queue; it rotates the praise. */
export function feedbackText(q: Question, a: AnswerState, index: number): FeedbackText {
  const praise = PRAISE[index % PRAISE.length]!;
  return isCodeQuestion(q) ? codeFeedback(q, a, praise) : cssFeedback(q, a, praise);
}
