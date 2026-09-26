// Runtime checks for the content JSON. The typed exports in ./index.ts are
// unchecked casts, so this is what guarantees they tell the truth.
// Returns a list of human-readable problems; empty means valid.
import { sanitizeCssKeyword } from '../lib/sanitize';
import type { Demo, Question, QuestionTypeInfo, Topics, Unit } from './types';

const TYPE_KEYS = ['predict', 'pairs', 'versus', 'build', 'tune', 'bug', 'type'];

const isStr = (v: unknown): v is string => typeof v === 'string';
const isInt = (v: unknown): v is number => Number.isInteger(v);
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const inRange = (i: unknown, len: number) => isInt(i) && i >= 0 && i < len;

export interface ContentBundle {
  units: readonly Unit[];
  questions: readonly Question[];
  questionTypes: readonly QuestionTypeInfo[];
  topics: Topics;
}

export function validateContent(c: ContentBundle): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);

  // question-types.json
  const typeKeys = c.questionTypes.map((t) => t.key);
  if (typeKeys.join() !== TYPE_KEYS.join()) err('question-types', `expected keys ${TYPE_KEYS.join(', ')} in order`);
  c.questionTypes.forEach((t) => {
    if (!isStr(t.name) || !isStr(t.blurb)) err(`question-types/${t.key}`, 'name and blurb must be strings');
  });

  // lessons.json
  const unitKeys = new Set<string>();
  c.units.forEach((u, ui) => {
    const at = `lessons/${u.key ?? ui}`;
    if (!isStr(u.key) || !isStr(u.name) || !isStr(u.blurb)) err(at, 'key, name and blurb must be strings');
    if (unitKeys.has(u.key)) err(at, 'duplicate unit key');
    unitKeys.add(u.key);
    if (!Array.isArray(u.cards) || u.cards.length === 0) return err(at, 'needs at least one card');
    u.cards.forEach((card, ci) => {
      const cat = `${at}/card ${ci + 1}`;
      if (!isStr(card.title) || !isStr(card.body)) err(cat, 'title and body must be strings');
      if (card.tip !== undefined && !isStr(card.tip)) err(cat, 'tip must be a string');
      if (card.body && card.body.split('`').length % 2 === 0) err(cat, 'body has an unmatched backtick');
      if (card.tip && card.tip.split('`').length % 2 === 0) err(cat, 'tip has an unmatched backtick');
      if (card.demo) validateDemo(card.demo, cat, err);
    });
  });

  // questions.json
  const ids = new Set<string>();
  c.questions.forEach((q, qi) => {
    const at = `questions/${q.id ?? qi}`;
    if (!isStr(q.id) || !isStr(q.prompt) || !isStr(q.explain)) err(at, 'id, prompt and explain must be strings');
    if (ids.has(q.id)) err(at, 'duplicate id');
    ids.add(q.id);
    if (!TYPE_KEYS.includes(q.type)) return err(at, `unknown type "${String(q.type)}"`);
    if (q.explain && q.explain.split('`').length % 2 === 0) err(at, 'explain has an unmatched backtick');
    validateQuestion(q, at, err);
  });
  TYPE_KEYS.forEach((t) => {
    if (!c.questions.some((q) => q.type === t)) err('questions', `no question of type "${t}" (mixed review needs one)`);
  });

  // topics.json
  unitKeys.forEach((k) => {
    if (!c.topics[k]) err(`topics`, `missing entry for unit "${k}"`);
  });
  Object.entries(c.topics).forEach(([k, list]) => {
    if (!unitKeys.has(k)) err(`topics/${k}`, 'no unit with this key');
    if (!isStrArr(list) || list.length === 0) return err(`topics/${k}`, 'must be a non-empty list of ids');
    list.forEach((id) => {
      if (!ids.has(id)) err(`topics/${k}`, `unknown question id "${id}"`);
    });
  });

  return errors;
}

type Err = (where: string, msg: string) => void;

function validateDemo(d: Demo, at: string, err: Err) {
  if (!isStr(d.base)) err(at, 'demo.base must be a string');
  const kidsOk = (kids: unknown, where: string) => {
    if (!Array.isArray(kids) || kids.length === 0) return err(where, 'needs at least one kid');
    kids.forEach((k, i) => {
      if (!isStr(k?.s) || !isStr(k?.t)) err(where, `kid ${i} needs string s and t`);
      if (k?.w !== undefined && !isStr(k.w)) err(where, `kid ${i} w must be a string`);
    });
  };

  if (d.kind === 'choice') {
    if (!isStr(d.label)) err(at, 'choice demo needs a label');
    if (!Array.isArray(d.opts) || d.opts.length < 2) return err(at, 'choice demo needs 2+ options');
    if (d.start !== undefined && !inRange(d.start, d.opts.length)) err(at, 'choice start out of range');
    d.opts.forEach((o, i) => {
      if (!isStr(o.label) || !isStrArr(o.code)) err(at, `choice option ${i} needs label and code[]`);
      kidsOk(o.kids, `${at}/option ${o.label}`);
    });
    return;
  }
  if ((d as { kind?: unknown }).kind !== undefined) return err(at, `unknown demo kind "${String((d as { kind?: unknown }).kind)}"`);

  kidsOk(d.kids, at);
  if (d.show !== undefined) {
    Object.entries(d.show).forEach(([sel, lines]) => {
      if (!isStrArr(lines)) err(at, `show["${sel}"] must be a list of strings`);
    });
  }
  if (!Array.isArray(d.knobs) || d.knobs.length === 0) return err(at, 'knob demo needs at least one knob');
  d.knobs.forEach((k, i) => {
    const kat = `${at}/knob ${k.prop ?? i}`;
    if (!isStr(k.prop) || !isStr(k.sel)) err(kat, 'prop and sel must be strings');
    if (!isStrArr(k.opts) || k.opts.length < 2) err(kat, 'needs 2+ string options');
    if (k.start !== undefined && !inRange(k.start, k.opts?.length ?? 0)) err(kat, 'start out of range');
    const t = k.target;
    if (!(t === 'parent' || t === 'kids' || inRange(t, d.kids?.length ?? 0))) err(kat, `bad target ${JSON.stringify(t)}`);
  });
  d.legend?.forEach((l, i) => {
    if (!isStr(l.sw) || !isStr(l.l)) err(at, `legend ${i} needs sw and l`);
  });
}

function validateQuestion(q: Question, at: string, err: Err) {
  switch (q.type) {
    case 'predict':
      if (!isStrArr(q.code) || !isStr(q.stage) || !isStrArr(q.kids)) err(at, 'needs code[], stage, kids[]');
      if (!Array.isArray(q.opts) || q.opts.length < 2) return err(at, 'needs 2+ opts');
      q.opts.forEach((o, i) => {
        if (!isStr(o.s) || !isStr(o.d)) err(at, `opt ${i} needs s and d`);
        if (o.kids !== undefined && !isStrArr(o.kids)) err(at, `opt ${i} kids must be strings`);
      });
      if (!inRange(q.answer, q.opts.length)) err(at, 'answer out of range');
      return;
    case 'pairs': {
      if (!Array.isArray(q.items) || q.items.length !== 4) return err(at, 'needs exactly 4 items');
      q.items.forEach((it, i) => {
        if (![it.id, it.code, it.shape, it.text, it.label].every(isStr)) err(at, `item ${i} needs id, code, shape, text, label`);
      });
      const itemIds = q.items.map((it) => it.id).sort().join();
      if (!isStrArr(q.order) || [...q.order].sort().join() !== itemIds) err(at, 'order must be a permutation of item ids');
      return;
    }
    case 'versus':
      if (!isStrArr(q.code) || !isStrArr(q.opts) || q.opts.length < 2) err(at, 'needs code[] and 2+ opts');
      if (!q.opts?.includes(q.answer)) err(at, 'answer must be one of opts');
      if (!Array.isArray(q.scores) || q.scores.filter((s) => s.win === true).length !== 1) err(at, 'scores needs exactly one winner');
      return;
    case 'build': {
      if (q.apply !== 'parent' && q.apply !== 'child') err(at, 'apply must be parent or child');
      if (!isStr(q.boxBase)) err(at, 'needs boxBase');
      const n = q.answer?.length;
      if (!isStrArr(q.props) || !isStrArr(q.defaults) || !isStrArr(q.answer) || q.props.length !== n || q.defaults.length !== n) {
        return err(at, 'props, defaults and answer must be string lists of equal length');
      }
      const slots = q.code.filter((l): l is { slot: number } => typeof l !== 'string').map((l) => l.slot);
      if ([...slots].sort().join() !== q.answer.map((_, i) => i).join()) err(at, 'code must contain each slot 0..n-1 exactly once');
      const bank = [...q.bank];
      q.answer.forEach((w) => {
        const i = bank.indexOf(w);
        if (i === -1) err(at, `bank is missing answer word "${w}"`);
        else bank.splice(i, 1);
      });
      return;
    }
    case 'tune': {
      const nums = [q.min, q.max, q.step, q.start, q.target, q.count];
      if (!nums.every((v) => typeof v === 'number')) return err(at, 'min, max, step, start, target, count must be numbers');
      if (q.apply !== 'parent' && q.apply !== 'child') err(at, 'apply must be parent or child');
      const reachable = (v: number) => v >= q.min && v <= q.max && (v - q.min) % q.step === 0;
      if (!reachable(q.start)) err(at, 'start is not reachable with min/max/step');
      if (!reachable(q.target)) err(at, 'target is not reachable with min/max/step');
      if (q.start === q.target) err(at, 'start equals target');
      return;
    }
    case 'bug':
      if (!isStrArr(q.code)) return err(at, 'needs code[]');
      if (!isInt(q.answer) || q.answer < 1 || q.answer > q.code.length) err(at, 'answer must be a 1-based line number');
      return;
    case 'type':
      if (!isStrArr(q.accept) || q.accept.length === 0) return err(at, 'needs accept[]');
      q.accept.forEach((a) => {
        if (sanitizeCssKeyword(a) !== a) err(at, `accept "${a}" can never match sanitized input`);
      });
      return;
  }
}
