// Narrowing helpers for the content unions.
import type { Demo, RustDemo } from './types';

export function isRustDemo(d: Demo): d is RustDemo {
  return d.kind === 'code' || d.kind === 'rs-choice';
}
