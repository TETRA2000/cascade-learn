import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-predict-1 prints "5 6" (option A)
describe('Predict the output (Rust)', () => {
  it('shows the visible code and every option as text', () => {
    renderQuiz('rs-predict', {}, 0, 'rust');
    expect(screen.getByText('Predict the output')).toBeInTheDocument();
    const code = screen.getByLabelText('Rust code');
    expect(code).toHaveTextContent('let mut b = a;');
    expect(code).not.toHaveTextContent('fn main');
    expect(screen.getAllByRole('button', { name: /^Option [A-D]:/ })).toHaveLength(4);
    expect(screen.getByRole('button', { name: "Option D: Doesn't compile" })).toBeInTheDocument();
  });

  it('marks a wrong pick with text and gives the answer', async () => {
    const { user } = renderQuiz('rs-predict', {}, 0, 'rust');
    await user.click(screen.getByRole('button', { name: 'Option B: 6 6' }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Answer: A');
    expect(screen.getByRole('button', { name: 'Option A: 5 6, correct answer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Option B: 6 6, your answer, incorrect' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('rustc says')).not.toBeInTheDocument();
  });
});
