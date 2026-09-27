import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { courseById, questionById, type CodeQ } from '../../../content';
import { freshAnswer } from '../../grade';
import { renderQuiz } from '../../testUtils';
import { CodeFix } from './CodeFix';

// rs-fix-1: option A clones `s`
describe('Fix it (Rust)', () => {
  it('shows the compiler error first and each fix as a readable diff', async () => {
    const { user } = renderQuiz('rs-fix', {}, 0, 'rust');
    const error = screen.getByRole('region', { name: 'Compiler error' });
    expect(error).toHaveTextContent('Doesn’t compile');
    expect(error).toHaveTextContent('E0382');
    expect(screen.getByLabelText('Rust code')).toHaveTextContent('let t = s;');
    const a = screen.getByRole('button', { name: 'Option A: change “let t = s;” to “let t = s.clone();”' });
    expect(within(a).getByText('−')).toBeInTheDocument();
    expect(within(a).getByText('+')).toBeInTheDocument();
    await user.click(a);
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
  });
});

// Component-level, on the bundled ts-fix-1 (a `const` reassigned; option B makes it `let`).
describe('Fix it (TypeScript)', () => {
  it('titles the compiler error "Type error", not the Rust title', () => {
    const q = questionById(courseById('ts'), 'ts-fix-1') as CodeQ<'fix'>;
    render(<CodeFix question={q} answer={freshAnswer(q)} act={vi.fn()} />);
    const region = screen.getByRole('region', { name: 'Compiler error' });
    expect(region).toHaveTextContent('Type error');
    expect(region).not.toHaveTextContent('Doesn’t compile');
    expect(region).toHaveTextContent('error TS2588: Cannot assign to');
    expect(screen.getByLabelText('TypeScript code')).toHaveTextContent('const count = 0;');
  });
});
