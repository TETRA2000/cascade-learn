import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CourseIcon } from './icons';

describe('CourseIcon', () => {
  it('renders a different icon for each course name', () => {
    const { container: css } = render(<CourseIcon name="css" />);
    const { container: rust } = render(<CourseIcon name="rust" />);
    expect(css.querySelector('svg')).toBeInTheDocument();
    expect(rust.querySelector('svg')).toBeInTheDocument();
    expect(css.innerHTML).not.toBe(rust.innerHTML);
  });
});
