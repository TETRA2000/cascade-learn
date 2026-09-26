// Runtime checks for the content JSON. The typed exports in ./index.ts are
// unchecked casts, so this is what guarantees they tell the truth.
// Each function returns a list of human-readable problems; empty means valid.
import { COURSE_ICON_NAMES, isCourseId, TYPE_KEYS } from './typeKeys';
import type { Course, CourseInfo } from './types';
import { validateCssDemo, validateCssQuestion } from './validateCss';
import { isStr, isStrArr } from './validateUtil';

/** courses.json against the course ids this build bundles content for. */
export function validateCourses(infos: readonly CourseInfo[], bundled: readonly string[]): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
  const ids = infos.map((c) => c.id);
  infos.forEach((c, i) => {
    const at = `courses/${c.id ?? i}`;
    if (![c.id, c.name, c.tagline, c.blurb].every(isStr)) err(at, 'id, name, tagline and blurb must be strings');
    if (!isCourseId(c.id)) err(at, 'unknown course id');
    if (!COURSE_ICON_NAMES.includes(c.icon)) err(at, `unknown icon "${String(c.icon)}"`);
    if (ids.indexOf(c.id) !== i) err(at, 'duplicate course id');
    if (!bundled.includes(c.id)) err(at, 'no content bundled for this course');
  });
  bundled.forEach((id) => {
    if (!ids.includes(id as CourseInfo['id'])) err('courses', `bundled course "${id}" is not listed`);
  });
  return errors;
}

export function validateContent(c: Course): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
  const keys = TYPE_KEYS[c.id];

  // question-types.json
  const typeKeys = c.questionTypes.map((t) => t.key);
  if (typeKeys.join() !== keys.join()) err('question-types', `expected keys ${keys.join(', ')} in order`);
  c.questionTypes.forEach((t) => {
    if (!isStr(t.name) || !isStr(t.blurb)) err(`question-types/${t.key}`, 'name and blurb must be strings');
  });

  // lessons.json
  const unitKeys = new Set<string>();
  c.units.forEach((u, ui) => {
    const at = `lessons/${u.key ?? ui}`;
    if (!isStr(u.key) || !isStr(u.name) || !isStr(u.blurb)) err(at, 'key, name and blurb must be strings');
    if (unitKeys.has(u.key)) err(at, 'duplicate unit key');
    unitKeys.add(u.key);
    if (!Array.isArray(u.cards) || u.cards.length === 0) return err(at, 'needs at least one card');
    u.cards.forEach((card, ci) => {
      const cat = `${at}/card ${ci + 1}`;
      if (!isStr(card.title) || !isStr(card.body)) err(cat, 'title and body must be strings');
      if (card.tip !== undefined && !isStr(card.tip)) err(cat, 'tip must be a string');
      if (card.body && card.body.split('`').length % 2 === 0) err(cat, 'body has an unmatched backtick');
      if (card.tip && card.tip.split('`').length % 2 === 0) err(cat, 'tip has an unmatched backtick');
      if (card.demo) validateCssDemo(card.demo, cat, err);
    });
  });

  // questions.json
  const ids = new Set<string>();
  c.questions.forEach((q, qi) => {
    const at = `questions/${q.id ?? qi}`;
    if (!isStr(q.id) || !isStr(q.prompt) || !isStr(q.explain)) err(at, 'id, prompt and explain must be strings');
    if (ids.has(q.id)) err(at, 'duplicate id');
    ids.add(q.id);
    if (!keys.includes(q.type)) return err(at, `unknown type "${String(q.type)}"`);
    if (q.explain && q.explain.split('`').length % 2 === 0) err(at, 'explain has an unmatched backtick');
    validateCssQuestion(q, at, err);
  });
  keys.forEach((t) => {
    if (!c.questions.some((q) => q.type === t)) err('questions', `no question of type "${t}" (mixed review needs one)`);
  });

  // topics.json
  unitKeys.forEach((k) => {
    if (!c.topics[k]) err(`topics`, `missing entry for unit "${k}"`);
  });
  Object.entries(c.topics).forEach(([k, list]) => {
    if (!unitKeys.has(k)) err(`topics/${k}`, 'no unit with this key');
    if (!isStrArr(list) || list.length === 0) return err(`topics/${k}`, 'must be a non-empty list of ids');
    list.forEach((id) => {
      if (!ids.has(id)) err(`topics/${k}`, `unknown question id "${id}"`);
    });
  });

  return errors;
}
