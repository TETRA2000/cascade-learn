// Feedback sheet copy, split by course family.
import type { Question } from '../../content';
import type { AnswerState } from '../types';
import { cssFeedback } from './css';
import { PRAISE, type FeedbackText } from './shared';

export type { FeedbackText } from './shared';

/** `index` is the question's position in the queue; it rotates the praise. */
export function feedbackText(q: Question, a: AnswerState, index: number): FeedbackText {
  return cssFeedback(q, a, PRAISE[index % PRAISE.length]!);
}
