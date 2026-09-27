import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-compiles-1: A moves `s` (E0382), B borrows it and compiles
describe('Compiles? (Rust)', () => {
  it('describes each snippet by its code, grades the pick and shows rustc’s message', async () => {
    const { user } = renderQuiz('rs-compiles', {}, 0, 'rust');
    const a = screen.getByRole('button', { name: 'Snippet A' });
    expect(a).toHaveAccessibleDescription(/let t = s;/);
    await user.click(a);
    expect(a).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('Answer: B');
    expect(sheet).toHaveTextContent('rustc says');
    expect(sheet).toHaveTextContent('error[E0382]: borrow of moved value: `s`');
    expect(screen.getByRole('button', { name: 'Snippet B, correct answer' })).toBeInTheDocument();
    expect(screen.getByText('4 hearts left')).toBeInTheDocument();
  });
});
