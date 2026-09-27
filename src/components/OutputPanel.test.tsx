import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OutputPanel } from './OutputPanel';

describe('OutputPanel', () => {
  it('shows program output', () => {
    render(<OutputPanel output={['hi', 'there']} />);
    expect(screen.getByRole('region', { name: 'Output' }).querySelector('pre')?.textContent).toBe('hi\nthere');
  });

  it('shows a compile error with an icon and words, not just color', () => {
    render(<OutputPanel error="error[E0382]: borrow of moved value: `s`" />);
    const region = screen.getByRole('region', { name: 'Compiler error' });
    expect(region).toHaveTextContent('Doesn’t compile');
    expect(region).toHaveTextContent('error[E0382]: borrow of moved value: `s`');
    expect(region.querySelector('svg')).not.toBeNull();
  });
});
