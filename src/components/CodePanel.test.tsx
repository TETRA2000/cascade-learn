import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodePanel } from './CodePanel';

describe('CodePanel', () => {
  it('keeps CSS panels unnumbered', () => {
    render(<CodePanel lines={['.a { color: red; }']} label="CSS" />);
    expect(screen.getByLabelText('CSS').querySelector('.gutter')).toBeNull();
  });

  it('hides hidden Rust lines and numbers the visible ones', () => {
    render(<CodePanel lines={['# fn main() {', 'let a = 1;', 'let b = a;', '# }']} lang="rust" label="Rust code" />);
    const panel = screen.getByLabelText('Rust code');
    expect(panel.textContent).not.toContain('fn main');
    const gutters = [...panel.querySelectorAll('.gutter')];
    expect(gutters.map((g) => g.textContent)).toEqual(['1', '2']);
    expect(gutters[0]).toHaveAttribute('aria-hidden', 'true');
    expect(within(panel).getAllByText('let')[0]).toHaveClass('keyword');
  });
});
