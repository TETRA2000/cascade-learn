import { describe, expect, it } from 'vitest';
import { lessonName, lessonQuestionIds, questions, questionTypes, topics, units } from './index';
import { validateContent } from './validate';

describe('content', () => {
  it('passes validation', () => {
    expect(validateContent({ units, questions, questionTypes, topics })).toEqual([]);
  });

  it('has the expected size', () => {
    expect(units).toHaveLength(5);
    expect(units.flatMap((u) => u.cards)).toHaveLength(19);
    expect(questions).toHaveLength(22);
  });

  it('reports broken content', () => {
    const broken = structuredClone({ units, questions, questionTypes, topics }) as Parameters<typeof validateContent>[0];
    (broken.topics as Record<string, string[]>).flex = ['nope'];
    const errors = validateContent(broken);
    expect(errors).toContain('topics/flex: unknown question id "nope"');
  });
});

describe('lessonQuestionIds', () => {
  it('uses topics for a unit', () => {
    expect(lessonQuestionIds('topic:grid')).toEqual(['predict-3', 'predict-4', 'build-1']);
  });

  it('uses every question of a type', () => {
    expect(lessonQuestionIds('bug')).toEqual(['bug-1', 'bug-2', 'bug-3']);
  });

  it('picks one question per type, in difficulty order, for mixed review', () => {
    const ids = lessonQuestionIds('mixed', () => 0);
    expect(ids).toEqual(['predict-1', 'pairs-1', 'versus-1', 'build-1', 'tune-1', 'bug-1', 'type-1']);
    const types = lessonQuestionIds('mixed', () => 0.999).map((id) => questions.find((q) => q.id === id)?.type);
    expect(types).toEqual(questionTypes.map((t) => t.key));
  });
});

describe('lessonName', () => {
  it('names each kind of run', () => {
    expect(lessonName('mixed')).toBe('Mixed review');
    expect(lessonName('topic:box')).toBe('The box model — practice');
    expect(lessonName('tune')).toBe('Tune to target');
  });
});
