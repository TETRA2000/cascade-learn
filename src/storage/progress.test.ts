import { describe, expect, it } from 'vitest';
import {
  emptyProgress,
  LEGACY_STORAGE_KEY,
  localProgressStore,
  migrateV1,
  parseProgress,
  STORAGE_KEY,
  totalXp,
  type CourseProgress,
  type Progress,
} from './progress';

const cssOnly = (patch: Partial<CourseProgress> = {}): Progress => ({
  activeCourse: 'css',
  courses: { css: { completedUnits: {}, completedSets: {}, xp: 0, ...patch } },
});

describe('parseProgress', () => {
  it('returns empty progress for missing or corrupt data', () => {
    for (const raw of [null, '{not json', '"a string"', 'null', '[]']) expect(parseProgress(raw)).toEqual(emptyProgress());
  });

  it('keeps only well-formed fields and known courses', () => {
    const raw = JSON.stringify({
      activeCourse: 'go',
      courses: {
        css: { completedUnits: { box: true, flex: 'yes' }, completedSets: ['bug'], xp: 'lots' },
        go: { xp: 5 },
        rust: 'nope',
      },
    });
    expect(parseProgress(raw)).toEqual({ activeCourse: null, courses: { css: { completedUnits: { box: true }, completedSets: {}, xp: 0 } } });
  });

  it('floors XP and drops negatives', () => {
    expect(parseProgress(JSON.stringify({ courses: { css: { xp: 42.7 } } })).courses.css?.xp).toBe(42);
    expect(parseProgress(JSON.stringify({ courses: { css: { xp: -5 } } })).courses.css?.xp).toBe(0);
  });

  it('keeps a known active course', () => {
    expect(parseProgress(JSON.stringify({ activeCourse: 'rust', courses: {} })).activeCourse).toBe('rust');
  });
});

describe('migrateV1', () => {
  it('moves v1 progress into the CSS course and makes it active', () => {
    const v1 = JSON.stringify({ completedUnits: { grid: true }, completedSets: { mixed: true }, totalXp: 40 });
    expect(migrateV1(v1)).toEqual(cssOnly({ completedUnits: { grid: true }, completedSets: { mixed: true }, xp: 40 }));
  });

  it('ignores missing, corrupt or empty v1 data', () => {
    expect(migrateV1(null)).toBeNull();
    expect(migrateV1('{oops')).toBeNull();
    expect(migrateV1(JSON.stringify({ completedUnits: {}, completedSets: {}, totalXp: 0 }))).toBeNull();
  });
});

describe('totalXp', () => {
  it('sums every course', () => {
    expect(totalXp({ courses: { css: { completedUnits: {}, completedSets: {}, xp: 30 }, rust: { completedUnits: {}, completedSets: {}, xp: 15 } } })).toBe(45);
    expect(totalXp(emptyProgress())).toBe(0);
  });
});

describe('localProgressStore', () => {
  it('round-trips through localStorage under the v2 key', () => {
    const store = localProgressStore();
    const progress = cssOnly({ completedUnits: { grid: true }, completedSets: { 'topic:grid': true }, xp: 25 });
    store.save(progress);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(progress);
    expect(store.load()).toEqual(progress);
  });

  it('migrates v1 progress when there is no v2 yet, leaving v1 untouched', () => {
    const v1 = JSON.stringify({ completedUnits: {}, completedSets: {}, totalXp: 25 });
    localStorage.setItem(LEGACY_STORAGE_KEY, v1);
    expect(localProgressStore().load()).toEqual(cssOnly({ xp: 25 }));
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(v1);
  });

  it('prefers v2 over v1', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ totalXp: 25 }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cssOnly({ xp: 10 })));
    expect(totalXp(localProgressStore().load())).toBe(10);
  });

  it('degrades gracefully when storage throws (private mode, quota)', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    } as unknown as Storage;
    const store = localProgressStore(() => broken);
    expect(store.load()).toEqual(emptyProgress());
    expect(() => store.save(emptyProgress())).not.toThrow();
  });
});
