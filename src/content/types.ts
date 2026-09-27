// Types for the JSON in /content. Field-by-field spec: docs/content-schema.md.
//
// All `s`, `stage`, `base`, `shape`… strings are inline CSS declarations,
// applied as real CSS. In body/tip/explain text, `backtick` segments render
// as inline code. In code arrays, a line starting with `§` is HTML.

import type { CourseIconName, CourseId, QuestionTypeKey } from './typeKeys';

// ----- question-types.json -----

export interface QuestionTypeInfo {
  key: QuestionTypeKey;
  name: string;
  blurb: string;
}

// ----- lessons.json -----

export interface Unit {
  key: string;
  name: string;
  blurb: string;
  cards: Card[];
}

export interface Card {
  title: string;
  body: string;
  tip?: string;
  demo?: Demo;
}

export type CssDemo = KnobDemo | ChoiceDemo;
export type RustDemo = CodeDemo | RustChoiceDemo;
export type Demo = CssDemo | RustDemo;

/** A styled child of a demo stage. */
export interface DemoKid {
  /** Child CSS. */
  s: string;
  /** Child text. */
  t: string;
  /** Optional wrapper CSS; defaults to `display:contents`. */
  w?: string;
}

/** `'parent'` styles the stage, `'kids'` every child, a number one child (0-based). */
export type KnobTarget = 'parent' | 'kids' | number;

export interface Knob {
  prop: string;
  opts: string[];
  target: KnobTarget;
  /** Selector shown in the code panel. */
  sel: string;
  /** Index into `opts` selected initially (default 0). */
  start?: number;
}

export interface LegendItem {
  /** Swatch CSS. */
  sw: string;
  /** Label. */
  l: string;
}

export interface KnobDemo {
  kind?: undefined;
  /** Stage (parent) CSS. */
  base: string;
  kids: DemoKid[];
  /** Fixed declarations shown in the code panel, grouped by selector. */
  show?: Record<string, string[]>;
  knobs: Knob[];
  legend?: LegendItem[];
}

export interface ChoiceOption {
  label: string;
  code: string[];
  kids: DemoKid[];
  note?: string;
}

export interface ChoiceDemo {
  kind: 'choice';
  label: string;
  start?: number;
  base: string;
  opts: ChoiceOption[];
}

/** A Rust example and what it does. At most one of `output` / `error`; neither means "compiles, prints nothing". */
export interface CodeDemo {
  kind: 'code';
  code: string[];
  output?: string[];
  /** rustc's first error line, e.g. `error[E0382]: borrow of moved value: \`s\``. */
  error?: string;
}

export interface RustChoiceOption {
  label: string;
  code: string[];
  /** Exactly one of `output` / `error`. */
  output?: string[];
  error?: string;
  note?: string;
}

/** Tap between variants of a Rust snippet and see how the result changes. */
export interface RustChoiceDemo {
  kind: 'rs-choice';
  label: string;
  start?: number;
  opts: RustChoiceOption[];
}

// ----- questions.json -----

interface QuestionBase {
  id: string;
  prompt: string;
  explain: string;
}

export interface StyledText {
  s: string;
  t: string;
}

export interface PredictQuestion extends QuestionBase {
  type: 'predict';
  code: string[];
  stage: string;
  /** CSS for each child box. */
  kids: string[];
  /** `s` = stage CSS for the option, `d` = accessible description, `kids` overrides the shared kids. */
  opts: { s: string; d: string; kids?: string[] }[];
  answer: number;
}

export interface PairItem {
  id: string;
  code: string;
  shape: string;
  text: string;
  label: string;
}

export interface PairsQuestion extends QuestionBase {
  type: 'pairs';
  items: PairItem[];
  /** Right-column order, by item id. */
  order: string[];
}

export interface VersusQuestion extends QuestionBase {
  type: 'versus';
  code: string[];
  /** Color keywords. */
  opts: string[];
  answer: string;
  scores: { sel: string; score: string; win: boolean }[];
}

export type BuildCodeLine = string | { slot: number };

export interface BuildQuestion extends QuestionBase {
  type: 'build';
  apply: 'parent' | 'child';
  boxBase: string;
  kids: StyledText[];
  code: BuildCodeLine[];
  props: string[];
  defaults: string[];
  answer: string[];
  /** May contain duplicates — chips are tracked by index. */
  bank: string[];
}

export interface TuneQuestion extends QuestionBase {
  type: 'tune';
  prop: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  start: number;
  target: number;
  apply: 'parent' | 'child';
  count: number;
  text: string;
  ghost: string;
  yours: string;
}

export interface BugQuestion extends QuestionBase {
  type: 'bug';
  stage: string;
  expected: StyledText;
  actual: StyledText;
  code: string[];
  /** 1-based line number. */
  answer: number;
}

export interface TypeQuestion extends QuestionBase {
  type: 'type';
  sel: string;
  prop: string;
  accept: string[];
  text: string;
  base: string;
}

export type CssQuestion =
  | PredictQuestion
  | PairsQuestion
  | VersusQuestion
  | BuildQuestion
  | TuneQuestion
  | BugQuestion
  | TypeQuestion;

// ----- Rust questions -----
// Code arrays are plain Rust. Lines starting with `# ` are hidden setup (see lib/code.ts).
// `error` strings are rustc's first error line, e.g. `error[E0382]: borrow of moved value: \`s\``.

export interface RustPredictQuestion extends QuestionBase {
  type: 'rs-predict';
  code: string[];
  /** `output` options render as program output; the `error` option reads "Doesn’t compile". */
  opts: { text: string; kind: 'output' | 'error' }[];
  answer: number;
  /** Required exactly when the answer is the `error` option. */
  error?: string;
}

export interface RustPairsQuestion extends QuestionBase {
  type: 'rs-pairs';
  items: { id: string; left: string; right: string }[];
  /** Right-column order, by item id. */
  order: string[];
}

export interface RustCompilesQuestion extends QuestionBase {
  type: 'rs-compiles';
  a: string[];
  b: string[];
  /** The snippet that compiles. */
  answer: 'a' | 'b';
  /** What rustc says about the other one. */
  error: string;
}

export type RustBuildSegment = string | { slot: number };
/** A plain line, or text segments with inline slots. */
export type RustBuildLine = string | RustBuildSegment[];

export interface RustBuildQuestion extends QuestionBase {
  type: 'rs-build';
  code: RustBuildLine[];
  /** May contain duplicates — chips are tracked by index. */
  bank: string[];
  /** The word for each slot, by slot number. */
  answer: string[];
  /** What the finished program prints. */
  output?: string[];
}

export interface RustErrorQuestion extends QuestionBase {
  type: 'rs-error';
  code: string[];
  /** 1-based visible line that rustc rejects. */
  answer: number;
  error: string;
}

export interface RustFixQuestion extends QuestionBase {
  type: 'rs-fix';
  code: string[];
  error: string;
  /** Each diff: `- old line` lines (a contiguous run of `code`) then `+ new line` lines. */
  opts: { diff: string[] }[];
  answer: number;
}

export interface RustTypeQuestion extends QuestionBase {
  type: 'rs-type';
  /** Exactly one `___` blank. */
  code: string[];
  /** Normalized answers (trimmed, single spaces); matching is case-sensitive. */
  accept: string[];
}

export type RustQuestion =
  | RustPredictQuestion
  | RustPairsQuestion
  | RustCompilesQuestion
  | RustBuildQuestion
  | RustErrorQuestion
  | RustFixQuestion
  | RustTypeQuestion;

export type Question = CssQuestion | RustQuestion;

// ----- topics.json -----

/** Unit key → question ids for its "Practice this" quiz. */
export type Topics = Record<string, string[]>;

// ----- Derived -----

/** What a quiz run practices: a mixed review, one unit's topic, or one question type. */
export type LessonKey = 'mixed' | `topic:${string}` | QuestionTypeKey;

// ----- courses.json -----

export interface CourseInfo {
  id: CourseId;
  name: string;
  /** Shown under the wordmark on Home. */
  tagline: string;
  /** Shown in the course picker. */
  blurb: string;
  icon: CourseIconName;
}

/** One course's four content files. */
export interface ContentBundle {
  units: readonly Unit[];
  questions: readonly Question[];
  questionTypes: readonly QuestionTypeInfo[];
  topics: Topics;
}

export interface Course extends CourseInfo, ContentBundle {}
