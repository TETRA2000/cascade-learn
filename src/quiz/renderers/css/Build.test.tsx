import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// build-1: .box { display: [grid]; place-items: [center]; } — bank: flex grid center middle block start
const btn = (name: string) => screen.getByRole('button', { name });

describe('Word bank', () => {
  it('fills blanks from the bank, previews live, and clears a blank on tap', async () => {
    const { user } = renderQuiz('build');
    expect(screen.getByTestId('build-goal').style.display).toBe('grid');
    expect(btn('Blank 1, empty')).toBeInTheDocument();
    expect(btn('Check')).toBeDisabled();

    await user.click(btn('flex'));
    expect(btn('flex, placed')).toBeDisabled();
    expect(btn('Blank 1: flex. Tap to remove')).toBeInTheDocument();
    expect(screen.getByTestId('build-yours').style.display).toBe('flex');

    await user.click(btn('Blank 1: flex. Tap to remove'));
    expect(btn('flex')).toBeEnabled();
    expect(screen.getByTestId('build-yours').style.display).toBe('block'); // the default

    await user.click(btn('grid'));
    await user.click(btn('center'));
    await user.click(btn('Check'));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
  });

  it('shows the full answer when wrong', async () => {
    const { user } = renderQuiz('build');
    await user.click(btn('flex'));
    await user.click(btn('center'));
    await user.click(btn('Check'));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Answer: display: grid; place-items: center;');
  });
});
