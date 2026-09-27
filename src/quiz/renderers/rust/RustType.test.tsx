import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-type-1 accepts "&mut" (and "& mut")
describe('Type the token (Rust)', () => {
  it('shows the typed token in the code and accepts messy spacing', async () => {
    const { user } = renderQuiz('rs-type', {}, 0, 'rust');
    const input = screen.getByLabelText('Missing token');
    expect(input).toHaveAttribute('maxlength', '40');
    expect(screen.getByTestId('code-blank')).toHaveTextContent('___');
    await user.type(input, '  &mut ');
    expect(screen.getByTestId('code-blank')).toHaveTextContent('&mut');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
  });

  it('is case-sensitive', async () => {
    const { user } = renderQuiz('rs-type', {}, 0, 'rust');
    await user.type(screen.getByLabelText('Missing token'), '&MUT');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Answer: &mut');
  });

  it('caps input at 40 characters even when maxlength is bypassed', async () => {
    const { user } = renderQuiz('rs-type', {}, 0, 'rust');
    const input = screen.getByLabelText('Missing token');
    input.removeAttribute('maxlength');
    await user.click(input);
    await user.paste('x'.repeat(50));
    expect(input).toHaveValue('x'.repeat(40));
  });
});
