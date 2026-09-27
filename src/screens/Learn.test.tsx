import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { Course } from '../content';
import type { Action } from '../state/app';
import { Learn } from './Learn';

const course: Course = {
  id: 'rust',
  name: 'Rust',
  tagline: '',
  blurb: '',
  icon: 'rust',
  questions: [],
  questionTypes: [],
  topics: {},
  units: [
    {
      key: 'own',
      name: 'Ownership',
      blurb: '',
      cards: [
        {
          title: 'Moves',
          body: 'Pick one.',
          demo: {
            kind: 'rs-choice',
            label: 'let t = …',
            opts: [
              { label: 's', code: ['# fn main() {', 'let t = s;', '# }'], error: 'error[E0382]: borrow of moved value: `s`', note: 'Moved.' },
              { label: 's.clone()', code: ['let t = s.clone();'], output: ['hi hi'] },
            ],
          },
        },
        { title: 'Plain', body: 'No result.', demo: { kind: 'code', code: ['fn main() {}'] } },
      ],
    },
  ],
};

function Harness({ card = 0 }: { card?: number }) {
  const [selection, setSelection] = useState([0]);
  const dispatch = (a: Action) => {
    if (a.type === 'pickOption') setSelection([a.option]);
  };
  return <Learn course={course} unitKey="own" card={card} selection={selection} dispatch={dispatch} />;
}

describe('Learn with Rust demos', () => {
  it('shows the picked variant’s code and result, and swaps both on tap', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const code = screen.getByLabelText('Rust code');
    expect(code).toHaveTextContent('let t = s;');
    expect(code).not.toHaveTextContent('fn main');
    const error = screen.getByRole('region', { name: 'Compiler error' });
    expect(error).toHaveTextContent('Doesn’t compile');
    expect(error).toHaveTextContent('E0382');
    expect(screen.getByText('Moved.')).toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'let t = …' });
    await user.click(within(group).getByRole('button', { name: 's.clone()' }));
    expect(within(group).getByRole('button', { name: 's.clone()' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Output' })).toHaveTextContent('hi hi');
    expect(screen.queryByRole('region', { name: 'Compiler error' })).not.toBeInTheDocument();
  });

  it('omits the result panel when a code demo has neither output nor error', () => {
    render(<Harness card={1} />);
    expect(screen.getByLabelText('Rust code')).toHaveTextContent('fn main() {}');
    expect(screen.queryByRole('region', { name: 'Output' })).not.toBeInTheDocument();
  });
});
