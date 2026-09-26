import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// tune-1: gap on the row, start 8px, target 24px, step 4, range 0–48
const btn = (name: string) => screen.getByRole('button', { name });

describe('Tune to target', () => {
  it('steps the value, redraws your row live, and grades against the target', async () => {
    const { user } = renderQuiz('tune');
    expect(screen.getByText('8px')).toBeInTheDocument();
    expect(screen.getByTestId('tune-ghost').style.gap).toBe('24px');
    expect(screen.getByTestId('tune-yours').style.gap).toBe('8px');

    for (let i = 0; i < 4; i++) await user.click(btn('Increase value'));
    expect(screen.getByText('24px')).toBeInTheDocument();
    expect(screen.getByTestId('tune-yours').style.gap).toBe('24px');

    await user.click(btn('Check'));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
    expect(btn('Increase value')).toBeDisabled();
  });

  it('disables decrease at the minimum', async () => {
    const { user } = renderQuiz('tune');
    await user.click(btn('Decrease value'));
    await user.click(btn('Decrease value'));
    expect(screen.getByText('0px')).toBeInTheDocument();
    expect(btn('Decrease value')).toBeDisabled();
  });

  it('explains the difference when wrong', async () => {
    const { user } = renderQuiz('tune');
    await user.click(btn('Check'));
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('Close, but not aligned');
    expect(sheet).toHaveTextContent('You set 8px — the target is 24px.');
  });
});
