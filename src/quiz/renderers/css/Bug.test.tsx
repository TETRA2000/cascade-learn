import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// bug-1: line 4 "border-radius: 12px" is missing its semicolon
describe('Spot the bug', () => {
  it('shows expected vs actual, picks a line, and reveals the right line when wrong', async () => {
    const { user } = renderQuiz('bug');
    expect(screen.getByText('Expected')).toBeInTheDocument();
    expect(screen.getByText('Actual')).toBeInTheDocument();

    const line2 = screen.getByRole('button', { name: 'Line 2: padding: 16px;' });
    await user.click(line2);
    expect(line2).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Not that one — it’s line 4');
    expect(screen.getByRole('button', { name: 'Line 4: border-radius: 12px, correct answer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Line 2: padding: 16px;, your answer, incorrect' })).toBeInTheDocument();
    expect(screen.getByText('4 hearts left')).toBeInTheDocument();
  });
});
