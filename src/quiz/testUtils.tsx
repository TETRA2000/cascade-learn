import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { LessonKey } from '../content';
import { Quiz } from './Quiz';

/** Render a quiz run for `lessonKey` (a question type key gives all questions of that type, in file order). */
export function renderQuiz(lessonKey: LessonKey, options: Parameters<typeof userEvent.setup>[0] = {}) {
  const onExit = vi.fn();
  const onComplete = vi.fn();
  const user = userEvent.setup(options);
  render(<Quiz lessonKey={lessonKey} onExit={onExit} onComplete={onComplete} />);
  return { user, onExit, onComplete };
}
