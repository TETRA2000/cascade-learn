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
            kind: 'code-choice',
            label: 'let t = …',
            opts: [
              {
                label: 's',
                code: ['# fn main() {', 'let t = s;', '# }'],
                error: 'error[E0382]: borrow of moved value: `s`',
                note: 'The `String` moved into `t`.',
              },
              { label: 's.clone()', code: ['let t = s.clone();'], output: ['hi hi'] },
            ],
          },
        },
        { title: 'Plain', body: 'No result.', demo: { kind: 'code', code: ['fn main() {}'] } },
      ],
    },
  ],
};

const tsCourse: Course = {
  id: 'ts',
  name: 'TypeScript',
  tagline: '',
  blurb: '',
  icon: 'ts',
  questions: [],
  questionTypes: [],
  topics: {},
  units: [
    {
      key: 'vals',
      name: 'Values',
      blurb: '',
      cards: [
        {
          title: 'Reads',
          body: 'Pick one.',
          demo: {
            kind: 'code-choice',
            label: 'words[…]',
            opts: [
              { label: '0', code: ['# const words: string[] = ["hi"];', 'console.log(words[0].toUpperCase());'], output: ['HI'] },
              {
                label: '5',
                code: ['# const words: string[] = ["hi"];', 'console.log("start");', 'console.log(words[5].toUpperCase());'],
                output: ['start'],
                thrown: "TypeError: Cannot read properties of undefined (reading 'toUpperCase')",
              },
            ],
          },
        },
      ],
    },
  ],
};

function Harness({ card = 0, of = course }: { card?: number; of?: Course }) {
  const [selection, setSelection] = useState([0]);
  const dispatch = (a: Action) => {
    if (a.type === 'pickOption') setSelection([a.option]);
  };
  return <Learn course={of} unitKey={of.units[0]!.key} card={card} selection={selection} dispatch={dispatch} />;
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
    expect(screen.getByText('String', { selector: 'code' })).toBeInTheDocument();

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

describe('Learn with TypeScript demos', () => {
  it('labels the code as TypeScript and swaps Output for Output + Runtime error on tap', async () => {
    const user = userEvent.setup();
    render(<Harness of={tsCourse} />);
    const code = screen.getByLabelText('TypeScript code');
    expect(code).toHaveTextContent('console.log(words[0].toUpperCase());');
    expect(code).not.toHaveTextContent('const words');
    expect(screen.getByRole('region', { name: 'Output' })).toHaveTextContent('HI');
    expect(screen.queryByRole('region', { name: 'Runtime error' })).not.toBeInTheDocument();

    const group = screen.getByRole('group', { name: 'words[…]' });
    await user.click(within(group).getByRole('button', { name: '5' }));
    expect(within(group).getByRole('button', { name: '5' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Output' })).toHaveTextContent('start');
    const thrown = screen.getByRole('region', { name: 'Runtime error' });
    expect(thrown).toHaveTextContent('Throws at runtime');
    expect(thrown).toHaveTextContent("TypeError: Cannot read properties of undefined (reading 'toUpperCase')");
    expect(screen.queryByRole('region', { name: 'Compiler error' })).not.toBeInTheDocument();
  });
});
