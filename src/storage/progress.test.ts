import { describe, expect, it } from 'vitest';
import { emptyProgress, localProgressStore, parseProgress, STORAGE_KEY } from './progress';

describe('parseProgress', () => {
  it('returns empty progress for missing or corrupt data', () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress('{not json')).toEqual(emptyProgress());
    expect(parseProgress('"a string"')).toEqual(emptyProgress());
    expect(parseProgress('null')).toEqual(emptyProgress());
  });

  it('keeps only well-formed fields', () => {
    const raw = JSON.stringify({ completedUnits: { box: true, flex: 'yes' }, completedSets: ['bug'], totalXp: 'lots' });
    expect(parseProgress(raw)).toEqual({ completedUnits: { box: true }, completedSets: {}, totalXp: 0 });
    expect(parseProgress(JSON.stringify({ totalXp: 42.7 })).totalXp).toBe(42);
    expect(parseProgress(JSON.stringify({ totalXp: -5 })).totalXp).toBe(0);
  });
});

describe('localProgressStore', () => {
  it('round-trips through localStorage under a versioned key', () => {
    const store = localProgressStore();
    const progress = { completedUnits: { grid: true as const }, completedSets: { 'topic:grid': true as const }, totalXp: 25 };
    store.save(progress);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(progress);
    expect(store.load()).toEqual(progress);
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
