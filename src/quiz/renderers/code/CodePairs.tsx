import type { CodeQ } from '../../../content';
import { PairBoard } from '../PairBoard';
import type { RendererProps } from '../types';
import styles from './CodePairs.module.css';

/** Tap a piece of code, then what it means. Code is plain monospace: the syntax colors are for dark panels. */
export function CodePairs({ question: q, answer, act }: RendererProps<CodeQ<'pairs'>>) {
  const byId = new Map(q.items.map((it) => [it.id, it]));
  return (
    <PairBoard
      ids={q.items.map((it) => it.id)}
      order={q.order}
      answer={answer}
      act={act}
      leftLabel="Code"
      rightLabel="Meanings"
      left={(id) => ({ label: byId.get(id)!.left, content: byId.get(id)!.left, className: styles.code })}
      right={(id) => ({ label: byId.get(id)!.right, content: byId.get(id)!.right, className: styles.meaning })}
    />
  );
}
