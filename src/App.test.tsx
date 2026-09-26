import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { STORAGE_KEY } from './storage/progress';

const heading = () => screen.getByRole('heading', { level: 1 });

describe('Home', () => {
  it('shows the Learn tab with the first unit as the hero and 5 hearts', () => {
    render(<App />);
    expect(screen.getByText('Start here')).toBeInTheDocument();
    expect(heading()).toHaveTextContent('How CSS works');
    expect(screen.getByText('5 hearts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Learn' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: /cards$/ })).toHaveLength(5);
  });

  it('shows total XP in the header', () => {
    render(<App />);
    expect(screen.getByText('0 XP')).toBeInTheDocument();
  });

  it('switches to the Practice tab', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Practice' }));
    expect(heading()).toHaveTextContent('Mixed review');
    expect(screen.getByRole('button', { name: 'Practice' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Spot the bug, 3 questions' })).toBeInTheDocument();
  });
});

describe('Learn flow', () => {
  it('walks a unit with Back / Next and live knobs, then Done marks it complete', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Grid basics, 4 cards' }));

    expect(heading()).toHaveTextContent('Define columns');
    expect(heading()).toHaveFocus();
    const progress = screen.getByRole('progressbar', { name: 'Lesson progress' });
    expect(progress).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

    // Knob: selection drives aria-pressed, the stage CSS and the code panel.
    const group = screen.getByRole('group', { name: 'grid-template-columns' });
    expect(within(group).getByRole('button', { name: '1fr 1fr 1fr' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(group).getByRole('button', { name: '100px 1fr' }));
    expect(within(group).getByRole('button', { name: '100px 1fr' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: '1fr 1fr 1fr' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('demo-stage').style.gridTemplateColumns).toBe('100px 1fr');
    expect(screen.getByLabelText('CSS')).toHaveTextContent('grid-template-columns: 100px 1fr;');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(heading()).toHaveTextContent('The fr unit');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(heading()).toHaveTextContent('Define columns');
    // Playground resets when you come back to a card.
    expect(screen.getByRole('button', { name: '1fr 1fr 1fr' })).toHaveAttribute('aria-pressed', 'true');

    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(heading()).toHaveTextContent('Centering with grid');
    expect(progress).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('button', { name: 'Practice this' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: 'Grid basics, 4 cards, completed' })).toBeInTheDocument();
    expect(screen.getByText('Up next')).toBeInTheDocument();
  });

  it('renders inline code, the key idea and choice captions', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'How CSS works, 3 cards' }));
    expect(screen.getByText('property: value', { selector: 'code' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Key idea' })).toHaveTextContent('Each declaration ends with a ;');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'div' }));
    expect(screen.getByText('Matches nothing — and that’s not an error')).toBeInTheDocument();
    expect(screen.getByLabelText('CSS')).toHaveTextContent('div { background: gold; }');
  });

  it('Practice this starts the unit’s topic quiz', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Grid basics, 4 cards' }));
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Practice this' }));
    expect(heading()).toHaveTextContent('Which layout does this grid draw?');
    expect(screen.getByText('Predict the render')).toBeInTheDocument();
  });

  it('closes a lesson without completing it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Flexbox basics, 5 cards' }));
    await user.click(screen.getByRole('button', { name: 'Close lesson' }));
    expect(screen.getByRole('button', { name: 'Flexbox basics, 5 cards' })).toBeInTheDocument();
  });
});

describe('Persistence', () => {
  it('restores completed units and XP from storage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedUnits: { basics: true }, completedSets: {}, totalXp: 40 }));
    render(<App />);
    expect(screen.getByText('40 XP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How CSS works, 3 cards, completed' })).toBeInTheDocument();
    expect(screen.getByText('Up next')).toBeInTheDocument();
  });

  it('saves progress when a unit is finished', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Grid basics, 4 cards' }));
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ completedUnits: { grid: true }, totalXp: 0 });
  });

  it('starts fresh when stored progress is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    render(<App />);
    expect(screen.getByText('0 XP')).toBeInTheDocument();
    expect(screen.getByText('Start here')).toBeInTheDocument();
  });
});
