import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-fix-1: option A clones `s`
describe('Fix it (Rust)', () => {
  it('shows the compiler error first and each fix as a readable diff', async () => {
    const { user } = renderQuiz('rs-fix', {}, 0, 'rust');
    expect(screen.getByRole('region', { name: 'Compiler error' })).toHaveTextContent('E0382');
    expect(screen.getByLabelText('Rust code')).toHaveTextContent('let t = s;');
    const a = screen.getByRole('button', { name: 'Option A: change “let t = s;” to “let t = s.clone();”' });
    expect(within(a).getByText('−')).toBeInTheDocument();
    expect(within(a).getByText('+')).toBeInTheDocument();
    await user.click(a);
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
  });
});
