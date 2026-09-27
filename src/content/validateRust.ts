// Checks for Rust-course demos and questions.
import type { RustDemo, RustQuestion } from './types';
import { inRange, isInt, isStr, isStrArr, type Err } from './validateUtil';
import { applyDiff, BLANK, normalizeToken, TOKEN_MAX_LENGTH, visibleLines } from '../lib/rustCode';

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

function validateOpts(opts: unknown, at: string, err: Err): boolean {
  if (Array.isArray(opts) && opts.length >= 3 && opts.length <= 4) return true;
  err(at, 'needs 3 or 4 opts');
  return false;
}

export function validateRustQuestion(q: RustQuestion, at: string, err: Err) {
  switch (q.type) {
    case 'rs-predict': {
      if (!hasCode(q.code)) err(at, 'needs visible code');
      if (!validateOpts(q.opts, at, err)) return;
      q.opts.forEach((o, i) => {
        if (!isStr(o.text) || (o.kind !== 'output' && o.kind !== 'error')) err(at, `opt ${i} needs text and kind "output" or "error"`);
      });
      if (!inRange(q.answer, q.opts.length)) return err(at, 'answer out of range');
      if ((q.opts[q.answer]!.kind === 'error') !== (q.error !== undefined)) {
        err(at, 'error is required exactly when the answer is the error option');
      }
      if (q.error !== undefined && !isRustError(q.error)) err(at, BAD_ERROR);
      return;
    }
    case 'rs-pairs': {
      if (!Array.isArray(q.items) || q.items.length !== 4) return err(at, 'needs exactly 4 items');
      q.items.forEach((it, i) => {
        if (![it.id, it.left, it.right].every(isStr)) err(at, `item ${i} needs id, left and right`);
      });
      const itemIds = q.items.map((it) => it.id).sort().join();
      if (!isStrArr(q.order) || [...q.order].sort().join() !== itemIds) err(at, 'order must be a permutation of item ids');
      return;
    }
    case 'rs-compiles':
      if (!hasCode(q.a) || !hasCode(q.b)) err(at, 'needs visible code in a and b');
      if (q.answer !== 'a' && q.answer !== 'b') err(at, "answer must be 'a' or 'b'");
      if (!isRustError(q.error)) err(at, BAD_ERROR);
      return;
    case 'rs-build': {
      if (!isStrArr(q.answer) || q.answer.length === 0 || !isStrArr(q.bank)) return err(at, 'needs answer and bank as string lists');
      if (!Array.isArray(q.code)) return err(at, 'needs code[]');
      const slots: number[] = [];
      q.code.forEach((line, i) => {
        if (isStr(line)) return;
        const segs = Array.isArray(line) ? (line as unknown[]) : [];
        const ok = segs.length > 0 && segs.every((seg) => isStr(seg) || isInt((seg as { slot?: unknown } | null)?.slot));
        if (!ok) return err(at, `code line ${i + 1} must be a string or a list of strings and { slot }`);
        segs.forEach((seg) => {
          if (!isStr(seg)) slots.push((seg as { slot: number }).slot);
        });
      });
      if ([...slots].sort((x, y) => x - y).join() !== q.answer.map((_, i) => i).join()) {
        err(at, 'code must contain each slot 0..n-1 exactly once');
      }
      const bank = [...q.bank];
      q.answer.forEach((w) => {
        const i = bank.indexOf(w);
        if (i === -1) err(at, `bank is missing answer word "${w}"`);
        else bank.splice(i, 1);
      });
      if (q.output !== undefined && !isStrArr(q.output)) err(at, 'output must be a list of strings');
      return;
    }
    case 'rs-error':
      if (!hasCode(q.code)) return err(at, 'needs visible code');
      if (!isInt(q.answer) || q.answer < 1 || q.answer > visibleLines(q.code).length) err(at, 'answer must be a visible line number');
      if (!isRustError(q.error)) err(at, BAD_ERROR);
      return;
    case 'rs-fix':
      if (!hasCode(q.code)) return err(at, 'needs visible code');
      if (!isRustError(q.error)) err(at, BAD_ERROR);
      if (!validateOpts(q.opts, at, err)) return;
      q.opts.forEach((o, i) => {
        const name = `option ${String.fromCharCode(65 + i)}`;
        if (!isStrArr(o.diff) || !o.diff.every((l) => l.startsWith('- ') || l.startsWith('+ '))) {
          return err(at, `${name} diff lines must start with "- " or "+ "`);
        }
        if (!applyDiff(q.code, o.diff)) err(at, `${name} diff does not apply to code`);
      });
      if (!inRange(q.answer, q.opts.length)) err(at, 'answer out of range');
      return;
    case 'rs-type':
      if (!hasCode(q.code)) return err(at, 'needs visible code');
      if (q.code.join('\n').split(BLANK).length !== 2) err(at, `code needs exactly one ${BLANK} blank`);
      if (!isStrArr(q.accept) || q.accept.length === 0) return err(at, 'needs accept[]');
      q.accept.forEach((a) => {
        if (normalizeToken(a) !== a || a.length > TOKEN_MAX_LENGTH) err(at, `accept "${a}" can never match normalized input`);
      });
      return;
  }
}
