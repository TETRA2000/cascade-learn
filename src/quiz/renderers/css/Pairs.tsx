import type { PairsQuestion } from '../../../content';
import { CssBox } from '../../../components/CssBox';
import { PairBoard } from '../PairBoard';
import type { RendererProps } from '../types';
import styles from './Pairs.module.css';

/** Tap a property, then what it draws. */
export function Pairs({ question: q, answer, act }: RendererProps<PairsQuestion>) {
  const byId = new Map(q.items.map((it) => [it.id, it]));
  return (
    <PairBoard
      ids={q.items.map((it) => it.id)}
      order={q.order}
      answer={answer}
      act={act}
      leftLabel="Properties"
      rightLabel="Results"
      left={(id) => ({ label: byId.get(id)!.code, content: byId.get(id)!.code, className: styles.code })}
      right={(id) => {
        const it = byId.get(id)!;
        return { label: it.label, content: <CssBox css={it.shape}>{it.text}</CssBox> };
      }}
    />
  );
}
