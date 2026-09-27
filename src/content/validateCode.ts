// Checks for code-course demos and questions. The language decides the error format.
import { langOf } from './guards';
import type { CodeCourseDemo, CodeQuestion } from './types';
import { inRange, isInt, isStr, isStrArr, type Err } from './validateUtil';
import { BLANK, findDiffRange, findWord, isHiddenLine, normalizeToken, TOKEN_MAX_LENGTH, visibleLines } from '../lib/code';
import { LANG, THROWS_TITLE, type CodeLang } from '../lib/codeLang';

export const isCodeError = (v: unknown, lang: CodeLang): v is string => isStr(v) && LANG[lang].errorPattern.test(v);
export const badError = (lang: CodeLang): string => `error must look like "${LANG[lang].errorFormat}"`;

/** A ts-infer `name`: a JS identifier. */
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const hasCode = (c: unknown): c is string[] => isStrArr(c) && visibleLines(c).length > 0;

function validateResult(r: { output?: unknown; error?: unknown; thrown?: unknown }, lang: CodeLang, at: string, err: Err) {
  if (r.output !== undefined && !isStrArr(r.output)) err(at, 'output must be a list of strings');
  if (r.error !== undefined && !isCodeError(r.error, lang)) err(at, badError(lang));
  if (r.thrown !== undefined) {
    if (lang !== 'ts') err(at, 'thrown is only for TypeScript');
    else if (!isStr(r.thrown) || r.thrown === '') err(at, 'thrown must be a non-empty string');
  }
}

export function validateCodeDemo(d: CodeCourseDemo, lang: CodeLang, at: string, err: Err) {
  if (d.kind === 'code') {
    if (!hasCode(d.code)) err(at, 'code demo needs visible code');
    if (d.output !== undefined && d.error !== undefined) return err(at, 'code demo has both output and error');
    if (d.thrown !== undefined && d.error !== undefined) return err(at, 'code demo has both thrown and error');
    return validateResult(d, lang, at, err);
  }
  if (!isStr(d.label)) err(at, 'code-choice demo needs a label');
  if (!Array.isArray(d.opts) || d.opts.length < 2) return err(at, 'code-choice demo needs 2+ options');
  if (d.start !== undefined && !inRange(d.start, d.opts.length)) err(at, 'code-choice start out of range');
  d.opts.forEach((o, i) => {
    const oat = `${at}/option ${o.label ?? i}`;
    if (!isStr(o.label) || !hasCode(o.code)) err(oat, 'needs label and visible code');
    if (lang === 'ts') {
      const hasResult = o.output !== undefined || o.thrown !== undefined;
      if ((o.error !== undefined) === hasResult) return err(oat, 'needs error, or output and/or thrown');
    } else if ((o.output === undefined) === (o.error === undefined)) {
      return err(oat, 'needs exactly one of output and error');
    }
    validateResult(o, lang, oat, err);
  });
}

function validateOpts(opts: unknown, at: string, err: Err): boolean {
  if (Array.isArray(opts) && opts.length >= 3 && opts.length <= 4) return true;
  err(at, 'needs 3 or 4 opts');
  return false;
}

export function validateCodeQuestion(q: CodeQuestion, at: string, err: Err) {
  const lang = langOf(q);
  const errorTitle = LANG[lang].errorTitle;
  switch (q.type) {
    case 'rs-predict':
    case 'ts-predict': {
      if (!hasCode(q.code)) err(at, 'needs visible code');
      if (!validateOpts(q.opts, at, err)) return;
      const kinds: readonly string[] = lang === 'ts' ? ['output', 'error', 'throws'] : ['output', 'error'];
      const kindList = lang === 'ts' ? '"output", "error" or "throws"' : '"output" or "error"';
      q.opts.forEach((o, i) => {
        if (!isStr(o.text) || !kinds.includes(o.kind)) err(at, `opt ${i} needs text and kind ${kindList}`);
        if (o.kind === 'error' && o.text !== errorTitle) err(at, `the error option must read "${errorTitle}"`);
        if (o.kind === 'throws' && o.text !== THROWS_TITLE) err(at, `the throws option must read "${THROWS_TITLE}"`);
      });
      const count = (kind: string) => q.opts.filter((o) => o.kind === kind).length;
      if (lang === 'ts' && (count('error') > 1 || count('throws') > 1)) err(at, 'at most one error option and one throws option');
      // Format checks: the error string, and thrown (TS only, non-empty).
      validateResult({ error: q.error, thrown: q.thrown }, lang, at, err);
      if (!inRange(q.answer, q.opts.length)) return err(at, 'answer out of range');
      const answerKind = q.opts[q.answer]!.kind;
      if ((answerKind === 'error') !== (q.error !== undefined)) {
        err(at, 'error is required exactly when the answer is the error option');
      }
      if (lang === 'ts' && (answerKind === 'throws') !== (q.thrown !== undefined)) {
        err(at, 'thrown is required exactly when the answer is the throws option');
      }
      return;
    }
    case 'ts-infer': {
      if (!hasCode(q.code)) return err(at, 'needs visible code');
      const lineText = isInt(q.line) && q.line >= 1 ? visibleLines(q.code)[q.line - 1] : undefined;
      if (lineText === undefined) err(at, 'line must be a visible line number');
      if (!isStr(q.name) || !IDENTIFIER.test(q.name)) err(at, 'name must be an identifier');
      else if (lineText !== undefined && findWord(lineText, q.name) === -1) err(at, `name "${q.name}" does not appear on line ${q.line}`);
      if (!validateOpts(q.opts, at, err)) return;
      if (!isStrArr(q.opts) || q.opts.some((o) => o.trim() === '') || new Set(q.opts).size !== q.opts.length) {
        err(at, 'opts must be unique and non-empty');
      }
      if (!inRange(q.answer, q.opts.length)) err(at, 'answer out of range');
      return;
    }
    case 'rs-pairs':
    case 'ts-pairs': {
      if (!Array.isArray(q.items) || q.items.length !== 4) return err(at, 'needs exactly 4 items');
      q.items.forEach((it, i) => {
        if (![it.id, it.left, it.right].every(isStr)) err(at, `item ${i} needs id, left and right`);
      });
      const itemIds = q.items.map((it) => it.id).sort().join();
      if (!isStrArr(q.order) || [...q.order].sort().join() !== itemIds) err(at, 'order must be a permutation of item ids');
      return;
    }
    case 'rs-compiles':
    case 'ts-compiles':
      if (!hasCode(q.a) || !hasCode(q.b)) err(at, 'needs visible code in a and b');
      if (q.answer !== 'a' && q.answer !== 'b') err(at, "answer must be 'a' or 'b'");
      if (!isCodeError(q.error, lang)) err(at, badError(lang));
      return;
    case 'rs-build':
    case 'ts-build': {
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
    case 'ts-error':
      if (!hasCode(q.code)) return err(at, 'needs visible code');
      if (!isInt(q.answer) || q.answer < 1 || q.answer > visibleLines(q.code).length) err(at, 'answer must be a visible line number');
      if (!isCodeError(q.error, lang)) err(at, badError(lang));
      return;
    case 'rs-fix':
    case 'ts-fix':
      if (!hasCode(q.code)) return err(at, 'needs visible code');
      if (!isCodeError(q.error, lang)) err(at, badError(lang));
      if (!validateOpts(q.opts, at, err)) return;
      q.opts.forEach((o, i) => {
        const name = `option ${String.fromCharCode(65 + i)}`;
        if (!isStrArr(o.diff) || !o.diff.every((l) => l.startsWith('- ') || l.startsWith('+ '))) {
          return err(at, `${name} diff lines must start with "- " or "+ "`);
        }
        const range = findDiffRange(q.code, o.diff);
        if (!range) return err(at, `${name} diff does not apply to code`);
        if (q.code.slice(range[0], range[1]).some(isHiddenLine)) err(at, `${name} diff must only remove visible lines`);
      });
      if (!inRange(q.answer, q.opts.length)) err(at, 'answer out of range');
      return;
    case 'rs-type':
    case 'ts-type': {
      if (!hasCode(q.code)) return err(at, 'needs visible code');
      if (q.code.join('\n').split(BLANK).length !== 2) err(at, `code needs exactly one ${BLANK} blank`);
      const blankLine = q.code.find((l) => l.includes(BLANK));
      if (blankLine !== undefined && isHiddenLine(blankLine)) err(at, 'the ___ blank must be on a visible line');
      if (!isStrArr(q.accept) || q.accept.length === 0) return err(at, 'needs accept[]');
      q.accept.forEach((a) => {
        if (normalizeToken(a) !== a || a.length > TOKEN_MAX_LENGTH) err(at, `accept "${a}" can never match normalized input`);
      });
      return;
    }
  }
}
