// Learner progress persistence. Everything goes through ProgressStore so a
// backend can replace localStorage without touching the app.
import type { LessonKey } from '../content';

export interface Progress {
  completedUnits: Record<string, true>;
  completedSets: Partial<Record<LessonKey, true>>;
  totalXp: number;
}

export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): void;
}

export const STORAGE_KEY = 'cascade.progress.v1';

export const emptyProgress = (): Progress => ({ completedUnits: {}, completedSets: {}, totalXp: 0 });

function trueKeys(value: unknown): Record<string, true> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v === true)
      .map(([k]) => [k, true as const]),
  );
}

/** Parse stored progress. Missing, malformed or foreign data becomes empty progress; never throws. */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyProgress();
  const d = data as Record<string, unknown>;
  const xp = d.totalXp;
  return {
    completedUnits: trueKeys(d.completedUnits),
    completedSets: trueKeys(d.completedSets) as Partial<Record<LessonKey, true>>,
    totalXp: typeof xp === 'number' && Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0,
  };
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
        return parseProgress(getStorage()?.getItem(STORAGE_KEY) ?? null);
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
