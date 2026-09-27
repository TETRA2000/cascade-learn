// Checks for Rust-course demos and questions.
import type { RustDemo } from './types';
import { inRange, isStr, isStrArr, type Err } from './validateUtil';
import { visibleLines } from '../lib/rustCode';

export const isRustError = (v: unknown): v is string => isStr(v) && /^error\[E\d{4}\]: \S/.test(v);
export const BAD_ERROR = 'error must look like "error[E0000]: message"';

const hasCode = (c: unknown): c is string[] => isStrArr(c) && visibleLines(c).length > 0;

function validateResult(r: { output?: unknown; error?: unknown }, at: string, err: Err) {
  if (r.output !== undefined && !isStrArr(r.output)) err(at, 'output must be a list of strings');
  if (r.error !== undefined && !isRustError(r.error)) err(at, BAD_ERROR);
}

export function validateRustDemo(d: RustDemo, at: string, err: Err) {
  if (d.kind === 'code') {
    if (!hasCode(d.code)) err(at, 'code demo needs visible code');
    if (d.output !== undefined && d.error !== undefined) return err(at, 'code demo has both output and error');
    return validateResult(d, at, err);
  }
  if (!isStr(d.label)) err(at, 'rs-choice demo needs a label');
  if (!Array.isArray(d.opts) || d.opts.length < 2) return err(at, 'rs-choice demo needs 2+ options');
  if (d.start !== undefined && !inRange(d.start, d.opts.length)) err(at, 'rs-choice start out of range');
  d.opts.forEach((o, i) => {
    const oat = `${at}/option ${o.label ?? i}`;
    if (!isStr(o.label) || !hasCode(o.code)) err(oat, 'needs label and visible code');
    if ((o.output === undefined) === (o.error === undefined)) return err(oat, 'needs exactly one of output and error');
    validateResult(o, oat, err);
  });
}
