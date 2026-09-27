import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackSheet } from './FeedbackSheet';
import { freshAnswer } from './grade';
import { rsError, rsType } from './rustFixtures';

describe('FeedbackSheet', () => {
  it('shows what rustc says for compile-error questions', () => {
    const answer = { ...freshAnswer(rsError), sel: 2, checked: true, ok: false };
    render(<FeedbackSheet question={rsError} answer={answer} index={0} guardMs={0} onContinue={vi.fn()} />);
    const sheet = screen.getByRole('region', { name: 'Feedback' });
    expect(sheet).toHaveTextContent('Not that one — it’s line 4');
    expect(screen.getByText('rustc says')).toBeInTheDocument();
    expect(sheet).toHaveTextContent('error[E0382]: borrow of moved value: `v`');
  });

  it('has no compiler block for other questions', () => {
    const answer = { ...freshAnswer(rsType), val: '&mut', checked: true, ok: true };
    render(<FeedbackSheet question={rsType} answer={answer} index={0} guardMs={0} onContinue={vi.fn()} />);
    expect(screen.queryByText('rustc says')).not.toBeInTheDocument();
  });
});
