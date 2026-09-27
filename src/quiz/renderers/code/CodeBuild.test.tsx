import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// rs-build-1: slot 1 takes "&String", slot 2 takes "&name"
describe('Word bank (Rust)', () => {
  it('fills inline blanks, grades them, then shows what the program prints', async () => {
    const { user } = renderQuiz('rs-build', {}, 0, 'rust');
    expect(screen.getByRole('button', { name: 'Blank 1, empty' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '&String' }));
    await user.click(screen.getByRole('button', { name: '&name' }));
    expect(screen.getByRole('button', { name: 'Blank 2: &name. Tap to remove' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '&name, placed' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Output' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
    expect(screen.getByRole('region', { name: 'Output' })).toHaveTextContent('ferris FERRIS');
  });

  it('gives the answer words when wrong', async () => {
    const { user } = renderQuiz('rs-build', {}, 0, 'rust');
    await user.click(screen.getByRole('button', { name: 'String' }));
    await user.click(screen.getByRole('button', { name: 'name' }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Answer: &String, &name');
    expect(screen.queryByRole('region', { name: 'Output' })).not.toBeInTheDocument();
  });

  it('renders the prompt’s backtick segments as inline code', () => {
    renderQuiz('rs-build', {}, 0, 'rust');
    const heading = screen.getByRole('heading', { level: 1 });
    expect(within(heading).getByText('shout', { selector: 'code' })).toBeInTheDocument();
  });
});
