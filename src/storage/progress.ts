// Learner progress persistence. Everything goes through ProgressStore so a
// backend can replace localStorage without touching the app.
import { COURSE_IDS, isCourseId, type CourseId, type LessonKey } from '../content';

export interface CourseProgress {
  completedUnits: Record<string, true>;
  completedSets: Partial<Record<LessonKey, true>>;
  xp: number;
}

export interface Progress {
  /** The course Home shows; null until the learner picks one. */
  activeCourse: CourseId | null;
  courses: Partial<Record<CourseId, CourseProgress>>;
}

export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): void;
}

export const STORAGE_KEY = 'cascade.progress.v2';
/** CSS-only progress from before courses existed. Read once to migrate; never written. */
export const LEGACY_STORAGE_KEY = 'cascade.progress.v1';

export const emptyCourseProgress = (): CourseProgress => ({ completedUnits: {}, completedSets: {}, xp: 0 });
export const emptyProgress = (): Progress => ({ activeCourse: null, courses: {} });

/** XP across every course. Derived, never stored, so it can't drift. */
export function totalXp(p: Pick<Progress, 'courses'>): number {
  return Object.values(p.courses).reduce((sum, c) => sum + (c?.xp ?? 0), 0);
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return asObject(JSON.parse(raw));
  } catch {
    return null;
  }
}

function trueKeys(value: unknown): Record<string, true> {
  return Object.fromEntries(
    Object.entries(asObject(value) ?? {})
      .filter(([, v]) => v === true)
      .map(([k]) => [k, true as const]),
  );
}

function wholeXp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function courseProgress(units: unknown, sets: unknown, xp: unknown): CourseProgress {
  return {
    completedUnits: trueKeys(units),
    completedSets: trueKeys(sets) as Partial<Record<LessonKey, true>>,
    xp: wholeXp(xp),
  };
}

/** Parse stored v2 progress. Missing, malformed or foreign data becomes empty progress; never throws. */
export function parseProgress(raw: string | null): Progress {
  const d = parseJson(raw);
  if (!d) return emptyProgress();
  const stored = asObject(d.courses) ?? {};
  const courses: Progress['courses'] = {};
  for (const id of COURSE_IDS) {
    const c = asObject(stored[id]);
    if (c) courses[id] = courseProgress(c.completedUnits, c.completedSets, c.xp);
  }
  return { activeCourse: isCourseId(d.activeCourse) ? d.activeCourse : null, courses };
}

/** v1 (CSS-only) progress as v2, or null when there's nothing worth migrating. */
export function migrateV1(raw: string | null): Progress | null {
  const d = parseJson(raw);
  if (!d) return null;
  const css = courseProgress(d.completedUnits, d.completedSets, d.totalXp);
  const empty = !Object.keys(css.completedUnits).length && !Object.keys(css.completedSets).length && css.xp === 0;
  return empty ? null : { activeCourse: 'css', courses: { css } };
}

function browserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage; // accessing it can throw when storage is blocked
  } catch {
    return undefined;
  }
}

export function localProgressStore(getStorage: () => Storage | undefined = browserStorage): ProgressStore {
  return {
    load() {
      try {
        const storage = getStorage();
        const raw = storage?.getItem(STORAGE_KEY) ?? null;
        if (raw !== null) return parseProgress(raw);
        return migrateV1(storage?.getItem(LEGACY_STORAGE_KEY) ?? null) ?? emptyProgress();
      } catch {
        return emptyProgress();
      }
    },
    save(progress) {
      try {
        getStorage()?.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch {
        // Full or blocked storage: progress lives on in memory for this session.
      }
    },
  };
}
