import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderQuiz } from '../testUtils';

// pairs-1: a "opacity: .4" ↔ "Faded square", b "border-radius: 50%" ↔ "Circle",
//          c "rotate: 45deg" ↔ "Tilted square", d "scale: .5" ↔ "Half-size square"
const PAIRS: [string, string][] = [
  ['opacity: .4', 'Faded square'],
  ['border-radius: 50%', 'Circle'],
  ['rotate: 45deg', 'Tilted square'],
  ['scale: .5', 'Half-size square'],
];
const btn = (name: string) => screen.getByRole('button', { name });

describe('Match pairs', () => {
  // shouldAdvanceTime: RTL's async wrapper drains with a real setTimeout(0) and only
  // advances fake timers when a `jest` global exists, so fully frozen timers hang under Vitest.
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());
  const setup = () => renderQuiz('pairs', { advanceTimers: vi.advanceTimersByTime });

  it('flashes a mismatch for 700 ms without costing a heart', async () => {
    const { user } = setup();
    await user.click(btn('opacity: .4'));
    expect(btn('opacity: .4')).toHaveAttribute('aria-pressed', 'true');
    await user.click(btn('Circle'));
    expect(btn('opacity: .4, not a match')).toBeInTheDocument();
    expect(btn('Circle, not a match')).toBeInTheDocument();
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(btn('opacity: .4')).toHaveAttribute('aria-pressed', 'false');
    expect(btn('Circle')).toBeInTheDocument();
  });

  it('keeps a newer pick when an old mismatch flash expires', async () => {
    const { user } = setup();
    await user.click(btn('opacity: .4'));
    await user.click(btn('Circle'));
    await user.click(btn('rotate: 45deg'));
    expect(screen.queryByRole('button', { name: /not a match/ })).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(btn('rotate: 45deg')).toHaveAttribute('aria-pressed', 'true');
  });

  it('auto-completes when all four pairs match, with no Check button', async () => {
    const { user } = setup();
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    expect(screen.getByText('Tap a property, then its result.')).toBeInTheDocument();
    for (const [code, label] of PAIRS.slice(0, 2)) {
      await user.click(btn(code));
      await user.click(btn(label));
    }
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
    expect(btn('opacity: .4, matched')).toBeDisabled();
    for (const [code, label] of PAIRS.slice(2)) {
      await user.click(btn(code));
      await user.click(btn(label));
    }
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('All pairs matched!');
    expect(sheet).toHaveTextContent('Flawless — no mismatches.');
  });
});
