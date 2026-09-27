// Typed access to the JSON in /content. Components get a Course from app
// state and use these helpers; they never import the JSON directly.
import coursesJson from '../../content/courses.json';
import cssLessons from '../../content/css/lessons.json';
import cssQuestions from '../../content/css/questions.json';
import cssQuestionTypes from '../../content/css/question-types.json';
import cssTopics from '../../content/css/topics.json';
import type { CourseId, QuestionTypeKey } from './typeKeys';
import type { ContentBundle, Course, CourseInfo, LessonKey, Question, QuestionTypeInfo, Topics, Unit } from './types';

export * from './types';
export * from './typeKeys';
export * from './guards';

// JSON imports infer wide types (e.g. `string` instead of `'parent'`), so
// these casts are checked at test time by validateContent() instead.
const BUNDLES: Partial<Record<CourseId, ContentBundle>> = {
  css: {
    units: cssLessons as unknown as readonly Unit[],
    questions: cssQuestions as unknown as readonly Question[],
    questionTypes: cssQuestionTypes as unknown as readonly QuestionTypeInfo[],
    topics: cssTopics as Topics,
  },
};

export const courseInfos = coursesJson as unknown as readonly CourseInfo[];

/** Course ids with content in this build. validateCourses() checks courses.json against it. */
export const bundledCourseIds = Object.keys(BUNDLES) as CourseId[];

/** Every listed course that has content, in picker order. */
export const courses: readonly Course[] = courseInfos.flatMap((info) => {
  const bundle = BUNDLES[info.id];
  return bundle ? [{ ...info, ...bundle }] : [];
});

export function findCourse(id: string | null): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function courseById(id: CourseId): Course {
  const course = findCourse(id);
  if (!course) throw new Error(`Unknown course "${id}"`);
  return course;
}

export function unitByKey(course: Course, key: string): Unit | undefined {
  return course.units.find((u) => u.key === key);
}

export function questionById(course: Course, id: string): Question | undefined {
  return course.questions.find((q) => q.id === id);
}

export function questionsOfType(course: Course, type: QuestionTypeKey): Question[] {
  return course.questions.filter((q) => q.type === type);
}

function isTypeKey(course: Course, key: string): key is QuestionTypeKey {
  return course.questionTypes.some((t) => t.key === key);
}

/** Display name for a quiz run, as on the results screen. */
export function lessonName(course: Course, key: LessonKey): string {
  if (key === 'mixed') return 'Mixed review';
  if (key.startsWith('topic:')) return (unitByKey(course, key.slice(6))?.name ?? '') + ' — practice';
  return course.questionTypes.find((t) => t.key === key)?.name ?? '';
}

/**
 * The initial question queue for a quiz run.
 * Mixed review = one random question per type, in question-types.json order.
 */
export function lessonQuestionIds(course: Course, key: LessonKey, random: () => number = Math.random): string[] {
  if (key === 'mixed') {
    return course.questionTypes.flatMap((t) => {
      const list = questionsOfType(course, t.key);
      const pick = list[Math.floor(random() * list.length)];
      return pick ? [pick.id] : [];
    });
  }
  if (key.startsWith('topic:')) return [...(course.topics[key.slice(6)] ?? [])];
  if (isTypeKey(course, key)) return questionsOfType(course, key).map((q) => q.id);
  return [];
}
