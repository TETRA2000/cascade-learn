import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { freshAnswer } from '../../grade';
import { tsInfer } from '../../tsFixtures';
import { CodeInfer } from './CodeInfer';

// Component-level: TS isn't a bundled course yet. In tsInfer, `x` on line 3 is `string` (option A).
describe('Hover the type', () => {
  it('marks the hovered name with more than color and offers types as pressed tiles', async () => {
    const act = vi.fn();
    render(<CodeInfer question={tsInfer} answer={freshAnswer(tsInfer)} act={act} />);
    expect(screen.getByLabelText('TypeScript code, x on line 3')).toBeInTheDocument();
    expect(screen.getByText('hover')).toBeInTheDocument();
    const tile = screen.getByRole('button', { name: 'Option A: x: string' });
    expect(tile).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(tile);
    expect(act).toHaveBeenCalledWith({ type: 'select', sel: 0 });
  });

  it('wraps only the first whole-word name on the line', () => {
    const { container } = render(<CodeInfer question={tsInfer} answer={freshAnswer(tsInfer)} act={vi.fn()} />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent(/^x$/);
    // The visible "hover" tag follows the marked name on line 3.
    expect(marks[0]!.parentElement?.textContent).toContain('console.log(xhover.length);');
    expect(marks[0]!.nextElementSibling).toHaveTextContent('hover');
  });

  it('announces tones after Check', () => {
    render(<CodeInfer question={tsInfer} answer={{ ...freshAnswer(tsInfer), sel: 1, checked: true }} act={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Option B: x: string | number, your answer, incorrect' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Option A: x: string, correct answer' })).toBeInTheDocument();
  });
});
