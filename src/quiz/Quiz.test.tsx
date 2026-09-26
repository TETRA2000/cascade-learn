import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderQuiz } from './testUtils';

// predict answers in file order: predict-1 C, predict-2 A, predict-3 D, predict-4 B
const check = () => screen.getByRole('button', { name: 'Check' });
const feedback = () => screen.getByRole('region', { name: 'Feedback' });

async function answer(user: UserEvent, letter: string) {
  await user.click(screen.getByRole('button', { name: new RegExp(`^Option ${letter}:`) }));
  await user.click(check());
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('Quiz with predict questions', () => {
  it('shows the type, prompt, code and four drawn options', () => {
    renderQuiz('predict');
    expect(screen.getByText('Predict the render')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which row does this CSS draw?');
    expect(screen.getByLabelText('CSS')).toHaveTextContent('justify-content: space-between;');
    expect(screen.getAllByRole('button', { name: /^Option [A-D]:/ })).toHaveLength(4);
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
    expect(check()).toBeDisabled();
  });

  it('checks a correct pick and shows praise, the explanation and a focused Continue', async () => {
    const { user } = renderQuiz('predict');
    const c = screen.getByRole('button', { name: 'Option C: spread out, centered vertically' });
    await user.click(c);
    expect(c).toHaveAttribute('aria-pressed', 'true');
    await user.click(check());
    expect(feedback()).toHaveTextContent('Nice — that’s right!');
    expect(feedback()).toHaveTextContent('justify-content places items along the main axis');
    expect(within(feedback()).getByRole('button', { name: 'Continue' })).toHaveFocus();
    expect(screen.getByRole('button', { name: /^Option C: .*, correct answer$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check' })).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' })).toHaveAttribute('aria-valuenow', '25');
  });

  it('marks a wrong pick with text, shows the answer and costs a heart', async () => {
    const { user } = renderQuiz('predict');
    await user.click(screen.getByRole('button', { name: /^Option A:/ }));
    await user.click(check());
    expect(feedback()).toHaveTextContent('Not quite');
    expect(feedback()).toHaveTextContent('Answer: C');
    expect(screen.getByRole('button', { name: /^Option A: .*, your answer, incorrect$/ })).toBeInTheDocument();
    expect(screen.getByText('4 hearts left')).toBeInTheDocument();
  });

  it('moves to the next question and focuses its prompt', async () => {
    const { user } = renderQuiz('predict');
    await answer(user, 'C');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Which stack does this CSS draw?');
    expect(h1).toHaveFocus();
  });

  it('quits from the close button', async () => {
    const { user, onExit } = renderQuiz('predict');
    await user.click(screen.getByRole('button', { name: 'Quit lesson' }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});

describe('end of a run', () => {
  it('shows results, reports the run once, and can practice again', async () => {
    const { user, onComplete, onExit } = renderQuiz('predict');
    for (const letter of ['C', 'A', 'D', 'B']) await answer(user, letter);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lesson complete!');
    expect(screen.getByText('Predict the render')).toBeInTheDocument();
    expect(screen.getByText('+40')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Perfect run — every answer right on the first try.')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith({ lessonKey: 'predict', xp: 40 });

    await user.click(screen.getByRole('button', { name: 'Practice again' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which row does this CSS draw?');
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quit lesson' }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('ends on Out of hearts after five misses without reporting a finished run', async () => {
    const { user, onComplete } = renderQuiz('predict');
    for (const letter of ['A', 'B', 'A', 'A', 'A']) await answer(user, letter); // all wrong
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Out of hearts');
    expect(onComplete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('5 hearts left')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which row does this CSS draw?');
  });
});
