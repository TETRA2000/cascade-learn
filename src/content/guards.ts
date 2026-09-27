// Narrowing helpers for the content unions.
import { langOfKey, type CodeLang } from '../lib/codeLang';
import type {
  BuildQuestion,
  CodeCourseDemo,
  CodeQuestion,
  Demo,
  PairsQuestion,
  Question,
  RustBuildQuestion,
  RustPairsQuestion,
} from './types';

export function isCodeDemo(d: Demo): d is CodeCourseDemo {
  return d.kind === 'code' || d.kind === 'code-choice';
}

export function isCodeQuestion(q: Question): q is CodeQuestion {
  return q.type.startsWith('rs-') || q.type.startsWith('ts-');
}

/** A code question's language, from its key prefix. */
export function langOf(q: CodeQuestion): CodeLang {
  return langOfKey(q.type);
}

/** Match pairs in any course: self-completing, never costs hearts. */
export function isPairs(q: Question): q is PairsQuestion | RustPairsQuestion {
  return q.type === 'pairs' || q.type === 'rs-pairs';
}

/** Word bank in any course: slots filled from bank chips. */
export function isBuild(q: Question): q is BuildQuestion | RustBuildQuestion {
  return q.type === 'build' || q.type === 'rs-build';
}
