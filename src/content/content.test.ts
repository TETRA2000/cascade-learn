import { describe, expect, it } from 'vitest';
import { bundledCourseIds, courseById, courseInfos, courses, lessonName, lessonQuestionIds, type CourseId, type CourseInfo } from './index';
import { validateContent, validateCourses } from './validate';

const css = courseById('css');

describe('courses', () => {
  it('lists exactly the bundled courses', () => {
    expect(validateCourses(courseInfos, bundledCourseIds)).toEqual([]);
    expect(courses.map((c) => c.id)).toEqual(courseInfos.map((c) => c.id));
  });

  it('reports malformed, duplicate, unbundled and unlisted courses', () => {
    const info = courseInfos[0]!;
    const bad = [{ ...info, icon: 'nope' }, info, { ...info, id: 'go', name: 7 }] as unknown as CourseInfo[];
    expect(validateCourses(bad, ['css', 'rust'])).toEqual([
      'courses/css: unknown icon "nope"',
      'courses/css: duplicate course id',
      'courses/go: id, name, tagline and blurb must be strings',
      'courses/go: unknown course id',
      'courses/go: no content bundled for this course',
      'courses: bundled course "rust" is not listed',
    ]);
  });

  it('throws for a course that is not bundled', () => {
    expect(() => courseById('nope' as CourseId)).toThrow('Unknown course "nope"');
  });
});

describe.each(courses.map((c) => [c.name, c] as const))('%s content', (_name, course) => {
  it('passes validation', () => {
    expect(validateContent(course)).toEqual([]);
  });
});

describe('css content', () => {
  it('has the expected size', () => {
    expect(css.units).toHaveLength(5);
    expect(css.units.flatMap((u) => u.cards)).toHaveLength(19);
    expect(css.questions).toHaveLength(22);
  });

  it('reports broken content', () => {
    const broken = structuredClone(css);
    (broken.topics as Record<string, string[]>).flex = ['nope'];
    expect(validateContent(broken)).toContain('topics/flex: unknown question id "nope"');
  });

  it('keeps demo kinds to their course', () => {
    const broken = structuredClone(css);
    const card = { title: 'T', body: 'B', demo: { kind: 'code', code: ['fn main() {}'] } };
    (broken.units[0]!.cards as unknown[]).push(card);
    expect(validateContent(broken)).toContain('lessons/basics/card 4: demo kind "code" does not belong in the css course');
  });
});

describe('lessonQuestionIds', () => {
  it('uses topics for a unit', () => {
    expect(lessonQuestionIds(css, 'topic:grid')).toEqual(['predict-3', 'predict-4', 'build-1']);
  });

  it('uses every question of a type', () => {
    expect(lessonQuestionIds(css, 'bug')).toEqual(['bug-1', 'bug-2', 'bug-3']);
  });

  it('picks one question per type, in difficulty order, for mixed review', () => {
    const ids = lessonQuestionIds(css, 'mixed', () => 0);
    expect(ids).toEqual(['predict-1', 'pairs-1', 'versus-1', 'build-1', 'tune-1', 'bug-1', 'type-1']);
    const types = lessonQuestionIds(css, 'mixed', () => 0.999).map((id) => css.questions.find((q) => q.id === id)?.type);
    expect(types).toEqual(css.questionTypes.map((t) => t.key));
  });
});

describe('lessonName', () => {
  it('names each kind of run', () => {
    expect(lessonName(css, 'mixed')).toBe('Mixed review');
    expect(lessonName(css, 'topic:box')).toBe('The box model — practice');
    expect(lessonName(css, 'tune')).toBe('Tune to target');
  });
});
