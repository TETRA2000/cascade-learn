import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../testUtils';

describe('Which rule wins?', () => {
  it('draws each option in its own color and reveals specificity scores after checking', async () => {
    const { user } = renderQuiz('versus'); // versus-1: teal wins
    expect(screen.getByLabelText('CSS')).toHaveTextContent('#intro { color: teal; }');
    const teal = screen.getByRole('button', { name: 'teal' });
    expect(within(teal).getByText('Hello').style.color).toBe('teal');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'tomato' }));
    expect(screen.getByRole('button', { name: 'tomato' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Check' }));

    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Not quite — it’s teal');
    expect(screen.getByRole('button', { name: 'teal, correct answer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'tomato, your answer, incorrect' })).toBeInTheDocument();
    const rows = within(screen.getByRole('table', { name: 'Specificity scores' })).getAllByRole('row');
    expect(rows[1]).toHaveTextContent(/#intro.*1 · 0 · 0.*wins/);
    expect(rows[2]).not.toHaveTextContent('wins');
  });
});
