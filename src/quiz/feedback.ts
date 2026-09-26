// Feedback sheet copy — ported from renderVals() in the prototype.
import type { Question } from '../content';
import type { AnswerState } from './types';

const PRAISE = ['Nice — that’s right!', 'Nailed it!', 'Exactly right!', 'Sharp eye!'];

export interface FeedbackText {
  title: string;
  /** Bold line under the title ("Answer: …"), or null when there is none to show. */
  detail: string | null;
}

/** `index` is the question's position in the queue; it rotates the praise. */
export function feedbackText(q: Question, a: AnswerState, index: number): FeedbackText {
  let title = a.ok ? PRAISE[index % PRAISE.length]! : 'Not quite';
  if (q.type === 'pairs') title = 'All pairs matched!';
  if (!a.ok && q.type === 'versus') title = `Not quite — it’s ${q.answer}`;
  if (!a.ok && q.type === 'bug') title = `Not that one — it’s line ${q.answer}`;
  if (!a.ok && q.type === 'tune') title = 'Close, but not aligned';

  const line = answerLine(q, a);
  if (q.type === 'pairs') return { title, detail: line };
  return { title, detail: !a.ok && line ? line : null };
}

function answerLine(q: Question, a: AnswerState): string {
  switch (q.type) {
    case 'predict':
      return `Answer: ${String.fromCharCode(65 + q.answer)}`;
    case 'pairs':
      return a.misses === 0
        ? 'Flawless — no mismatches.'
        : `${a.misses} ${a.misses === 1 ? 'mismatch' : 'mismatches'} along the way.`;
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
