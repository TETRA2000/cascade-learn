import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-error-1: line 5 uses `v` after line 3 moved it
describe('Spot the error (Rust)', () => {
  it('picks a line and reveals rustc’s line and message when wrong', async () => {
    const { user } = renderQuiz('rs-error', {}, 0, 'rust');
    const line3 = screen.getByRole('button', { name: 'Line 3: let w = v;' });
    await user.click(line3);
    expect(line3).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('Not that one — it’s line 5');
    expect(sheet).toHaveTextContent('error[E0382]: borrow of moved value: `v`');
    expect(screen.getByRole('button', { name: 'Line 5: println!("{}", v.len());, correct answer' })).toBeInTheDocument();
    expect(screen.getByText('4 hearts left')).toBeInTheDocument();
  });
});
