import type { CourseId, LessonKey } from '../content';

/** The learner's in-progress answer to the current question. Fields unused by a type keep their defaults. */
export interface AnswerState {
  /** predict: option index · versus: color keyword · bug: 1-based line number. */
  sel: number | string | null;
  /** build: bank index placed in each slot (indexes, because the bank may repeat words). */
  slots: (number | null)[];
  /** tune: current value. */
  num: number;
  /** type: raw input (sanitized only when it touches CSS or is graded). */
  val: string;
  /** pairs: pending picks, matched item ids, the mismatch being flashed, and mismatch count. */
  left: string | null;
  right: string | null;
  matched: Record<string, true>;
  miss: { left: string; right: string } | null;
  misses: number;
  checked: boolean;
  ok: boolean;
}

export interface Session {
  /** The course whose questions this run uses. */
  courseId: CourseId;
  lessonKey: LessonKey;
  /** Question ids; wrong answers are appended again. */
  queue: string[];
  idx: number;
  /** Initial queue length; the progress bar is solved / total. */
  total: number;
  hearts: number;
  solved: number;
  firstTry: number;
  xp: number;
  missed: Record<string, true>;
  answer: AnswerState;
  phase: 'question' | 'done' | 'out';
}
