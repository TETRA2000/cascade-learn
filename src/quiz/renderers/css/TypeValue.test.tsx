import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from '../../testUtils';

// type-1: .headline { text-transform: uppercase; }
describe('Type the value', () => {
  it('previews sanitized input live and checks on Enter', async () => {
    const { user } = renderQuiz('type');
    const input = screen.getByLabelText('text-transform');
    const preview = screen.getByTestId('type-preview');
    expect(preview.style.textTransform).toBe('initial');

    await user.type(input, 'UPPER');
    expect(preview.style.textTransform).toBe(''); // "upper" is not a valid value, so the browser drops it
    await user.type(input, 'CASE');
    expect(preview.style.textTransform).toBe('uppercase');

    await user.type(input, '{Enter}');
    expect(screen.getByRole('region', { name: 'Feedback' })).toHaveTextContent('Nice — that’s right!');
    expect(input).toBeDisabled();
  });

  it('keeps typed punctuation out of the preview CSS', async () => {
    const { user } = renderQuiz('type');
    await user.type(screen.getByLabelText('text-transform'), 'red;color:blue');
    expect(screen.getByTestId('type-preview').getAttribute('style') ?? '').not.toContain('blue');
  });

  it('does nothing on Enter with an empty answer', async () => {
    const { user } = renderQuiz('type');
    await user.type(screen.getByLabelText('text-transform'), '{Enter}');
    expect(screen.queryByRole('region', { name: 'Feedback' })).not.toBeInTheDocument();
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
  });
});
