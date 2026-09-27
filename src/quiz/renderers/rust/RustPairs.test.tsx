import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderQuiz } from '../../testUtils';

const PAIRS: [string, string][] = [
  ['String', 'Owned, growable text'],
  ['&String', 'Shared borrow, read-only'],
  ['&mut String', 'Exclusive borrow, can change it'],
  ['s.clone()', 'A deep copy with its own owner'],
];
const btn = (name: string) => screen.getByRole('button', { name });

describe('Match pairs (Rust)', () => {
  // Same timer setup as the CSS pairs test: shouldAdvanceTime keeps RTL's async helpers moving.
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('matches code to meaning without Check or hearts, then reports mismatches', async () => {
    const { user } = renderQuiz('rs-pairs', { advanceTimers: vi.advanceTimersByTime }, 0, 'rust');
    expect(screen.getByText('Tap a code item, then its meaning.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Code' })).toBeInTheDocument();

    await user.click(btn('String'));
    await user.click(btn('Shared borrow, read-only'));
    expect(btn('String, not a match')).toBeInTheDocument();
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(700);
    });

    for (const [left, right] of PAIRS) {
      await user.click(btn(left));
      await user.click(btn(right));
    }
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('All pairs matched!');
    expect(sheet).toHaveTextContent('1 mismatch along the way.');
  });
});
