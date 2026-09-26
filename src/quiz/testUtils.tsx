import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { CourseId, LessonKey } from '../content';
import { Quiz } from './Quiz';

/**
 * Render a quiz run for `lessonKey` (a question type key gives all questions of that type, in file order).
 * The double-tap guard is off (0 ms) unless `guardMs` is given, so tests can click Check then Continue at once.
 */
export function renderQuiz(
  lessonKey: LessonKey,
  options: Parameters<typeof userEvent.setup>[0] = {},
  guardMs = 0,
  courseId: CourseId = 'css',
) {
  const onExit = vi.fn();
  const onComplete = vi.fn();
  const user = userEvent.setup(options);
  render(<Quiz courseId={courseId} lessonKey={lessonKey} onExit={onExit} onComplete={onComplete} guardMs={guardMs} />);
  return { user, onExit, onComplete };
}
