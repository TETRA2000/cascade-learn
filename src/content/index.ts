// Typed access to the JSON in /content. Components import from here, never
// from the JSON files directly. Shape is enforced by validate.test.ts.
import lessonsJson from '../../content/lessons.json';
import questionsJson from '../../content/questions.json';
import questionTypesJson from '../../content/question-types.json';
import topicsJson from '../../content/topics.json';
import type { LessonKey, Question, QuestionTypeInfo, QuestionTypeKey, Topics, Unit } from './types';

export * from './types';

// JSON imports infer wide types (e.g. `string` instead of `'parent'`), so
// these casts are checked at test time by validateContent() instead.
export const units = lessonsJson as unknown as readonly Unit[];
export const questions = questionsJson as unknown as readonly Question[];
export const questionTypes = questionTypesJson as unknown as readonly QuestionTypeInfo[];
export const topics = topicsJson as Topics;

export function unitByKey(key: string): Unit | undefined {
  return units.find((u) => u.key === key);
}

export function questionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

export function questionsOfType(type: QuestionTypeKey): Question[] {
  return questions.filter((q) => q.type === type);
}

function isTypeKey(key: string): key is QuestionTypeKey {
  return questionTypes.some((t) => t.key === key);
}

/** Display name for a quiz run, as on the results screen. */
export function lessonName(key: LessonKey): string {
  if (key === 'mixed') return 'Mixed review';
  if (key.startsWith('topic:')) return (unitByKey(key.slice(6))?.name ?? '') + ' — practice';
  return questionTypes.find((t) => t.key === key)?.name ?? '';
}

/**
 * The initial question queue for a quiz run.
 * Mixed review = one random question per type, in question-types.json order.
 */
export function lessonQuestionIds(key: LessonKey, random: () => number = Math.random): string[] {
  if (key === 'mixed') {
    return questionTypes.flatMap((t) => {
      const list = questionsOfType(t.key);
      const pick = list[Math.floor(random() * list.length)];
      return pick ? [pick.id] : [];
    });
  }
  if (key.startsWith('topic:')) return [...(topics[key.slice(6)] ?? [])];
  if (isTypeKey(key)) return questionsOfType(key).map((q) => q.id);
  return [];
}
