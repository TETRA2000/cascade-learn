// CSS feedback copy — ported from renderVals() in the prototype.
import type { CssQuestion } from '../../content';
import type { AnswerState } from '../types';
import { optionLetter, pairsSummary, type FeedbackText } from './shared';

export function cssFeedback(q: CssQuestion, a: AnswerState, praise: string): FeedbackText {
  let title = a.ok ? praise : 'Not quite';
  if (q.type === 'pairs') title = 'All pairs matched!';
  if (!a.ok && q.type === 'versus') title = `Not quite — it’s ${q.answer}`;
  if (!a.ok && q.type === 'bug') title = `Not that one — it’s line ${q.answer}`;
  if (!a.ok && q.type === 'tune') title = 'Close, but not aligned';

  const line = answerLine(q, a);
  if (q.type === 'pairs') return { title, detail: line };
  return { title, detail: !a.ok && line ? line : null };
}

function answerLine(q: CssQuestion, a: AnswerState): string {
  switch (q.type) {
    case 'predict':
      return `Answer: ${optionLetter(q.answer)}`;
    case 'pairs':
      return pairsSummary(a.misses);
    case 'build':
      return 'Answer: ' + q.props.map((p, i) => `${p}: ${q.answer[i]};`).join(' ');
    case 'tune':
      return `You set ${a.num}${q.unit} — the target is ${q.target}${q.unit}.`;
    case 'type':
      return `Answer: ${q.prop}: ${q.accept[0]};`;
    case 'versus':
    case 'bug':
      return '';
  }
}
