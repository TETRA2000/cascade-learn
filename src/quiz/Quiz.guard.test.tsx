import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderQuiz } from './testUtils';

// A double tap (or a repeated Enter) on Check/Continue must not carry over to the
// button that replaces it in the same spot. tune-1: start 8px, target 24px.
describe('double-tap guard', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());
  const arm = () =>
    act(() => {
      vi.advanceTimersByTime(350);
    });
  const btn = (name: string) => screen.getByRole('button', { name });

  it('ignores Continue and the next Check until each has been on screen for a moment', async () => {
    const { user } = renderQuiz('tune', { advanceTimers: vi.advanceTimersByTime }, 350);
    arm();
    for (let i = 0; i < 4; i++) await user.click(btn('Increase value'));
    await user.click(btn('Check'));

    // Second half of a double tap on Check lands on the fresh Continue: ignored.
    await user.click(btn('Continue'));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
    expect(btn('Continue')).toHaveAttribute('aria-disabled', 'true');

    arm();
    expect(btn('Continue')).not.toHaveAttribute('aria-disabled');
    await user.click(btn('Continue'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Set the padding so the tag fills the outline');

    // Second half of a double tap on Continue lands on the next question's Check: ignored.
    await user.click(btn('Check'));
    expect(screen.queryByRole('region', { name: 'Feedback' })).not.toBeInTheDocument();
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();

    arm();
    await user.click(btn('Check'));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Close, but not aligned');
  });
});
