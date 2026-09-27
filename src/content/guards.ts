// Narrowing helpers for the content unions.
import type {
  BuildQuestion,
  Demo,
  PairsQuestion,
  Question,
  RustBuildQuestion,
  RustDemo,
  RustPairsQuestion,
  RustQuestion,
} from './types';

export function isRustDemo(d: Demo): d is RustDemo {
  return d.kind === 'code' || d.kind === 'rs-choice';
}

export function isRustQuestion(q: Question): q is RustQuestion {
  return q.type.startsWith('rs-');
}

/** Match pairs in any course: self-completing, never costs hearts. */
export function isPairs(q: Question): q is PairsQuestion | RustPairsQuestion {
  return q.type === 'pairs' || q.type === 'rs-pairs';
}

/** Word bank in any course: slots filled from bank chips. */
export function isBuild(q: Question): q is BuildQuestion | RustBuildQuestion {
  return q.type === 'build' || q.type === 'rs-build';
}
