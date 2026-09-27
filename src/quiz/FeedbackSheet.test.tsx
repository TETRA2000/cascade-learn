import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackSheet } from './FeedbackSheet';
import { freshAnswer } from './grade';
import { rsError, rsType } from './rustFixtures';
import { tsCompiles, tsPredictThrows } from './tsFixtures';

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

  it('labels the compiler block with the question’s compiler', () => {
    const answer = { ...freshAnswer(tsCompiles), sel: 'a' as const, checked: true, ok: false };
    render(<FeedbackSheet question={tsCompiles} answer={answer} index={0} guardMs={0} onContinue={vi.fn()} />);
    expect(screen.getByText('tsc says')).toBeInTheDocument();
    expect(screen.queryByText('rustc says')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent(tsCompiles.error);
  });

  it('shows what Node says when the program throws', () => {
    const answer = { ...freshAnswer(tsPredictThrows), sel: 0, checked: true, ok: false };
    render(<FeedbackSheet question={tsPredictThrows} answer={answer} index={0} guardMs={0} onContinue={vi.fn()} />);
    const node = screen.getByText('Node says').closest('figure');
    expect(node).toHaveTextContent(tsPredictThrows.thrown!);
    expect(screen.queryByText('tsc says')).not.toBeInTheDocument();
  });
});
