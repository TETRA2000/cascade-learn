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
/** A demo in a code course (Rust); the language comes from the course. */
export type CodeCourseDemo = CodeDemo | CodeChoiceDemo;
export type Demo = CssDemo | CodeCourseDemo;

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

/** A code example and what it does. At most one of `output` / `error`; neither means "compiles, prints nothing". */
export interface CodeDemo {
  kind: 'code';
  code: string[];
  output?: string[];
  /** rustc's first error line, e.g. `error[E0382]: borrow of moved value: \`s\``. */
  error?: string;
  /** TS only: what Node reports when the program throws at runtime. Never with `error`. */
  thrown?: string;
}

export interface CodeChoiceOption {
  label: string;
  code: string[];
  /** Exactly one of `output` / `error`. */
  output?: string[];
  error?: string;
  /** TS only: what Node reports when the program throws at runtime. Never with `error`. */
  thrown?: string;
  note?: string;
}

/** Tap between variants of a code snippet and see how the result changes. */
export interface CodeChoiceDemo {
  kind: 'code-choice';
  label: string;
  start?: number;
  opts: CodeChoiceOption[];
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

// ----- Code questions -----
// Shared shapes for the code courses, generic over their course-prefixed key.
// Code arrays are plain code. Lines starting with `# ` are hidden setup (see lib/code.ts).
// `error` strings are the compiler's first error line, e.g. rustc's `error[E0382]: borrow of moved value: \`s\``.

/** A shared question type's key in each code course, e.g. `CodeKey<'predict'>` = `'rs-predict' | 'ts-predict'`. */
export type CodeKey<K extends string> = `rs-${K}` | `ts-${K}`;

/** Predict option kinds per key: only TS programs can throw at runtime. */
export type PredictKind<K> = K extends 'ts-predict' ? 'output' | 'error' | 'throws' : 'output' | 'error';

export interface CodePredictQuestion<K extends CodeKey<'predict'> = CodeKey<'predict'>> extends QuestionBase {
  type: K;
  code: string[];
  /** `output` options render as program output; the `error` option reads the language's error title ("Doesn’t compile",
   * "Type error"), and TS's `throws` option reads "Throws at runtime". At most one `error` and one `throws` option. */
  opts: { text: string; kind: PredictKind<K> }[];
  answer: number;
  /** Required exactly when the answer is the `error` option. */
  error?: string;
  /** TS only: Node's `String(error)`, required exactly when the answer is the `throws` option. */
  thrown?: string;
}

export interface CodePairsQuestion<K extends CodeKey<'pairs'> = CodeKey<'pairs'>> extends QuestionBase {
  type: K;
  items: { id: string; left: string; right: string }[];
  /** Right-column order, by item id. */
  order: string[];
}

export interface CodeCompilesQuestion<K extends CodeKey<'compiles'> = CodeKey<'compiles'>> extends QuestionBase {
  type: K;
  a: string[];
  b: string[];
  /** The snippet that compiles. */
  answer: 'a' | 'b';
  /** What the compiler says about the other one. */
  error: string;
}

export type CodeBuildSegment = string | { slot: number };
/** A plain line, or text segments with inline slots. */
export type CodeBuildLine = string | CodeBuildSegment[];

export interface CodeBuildQuestion<K extends CodeKey<'build'> = CodeKey<'build'>> extends QuestionBase {
  type: K;
  code: CodeBuildLine[];
  /** May contain duplicates — chips are tracked by index. */
  bank: string[];
  /** The word for each slot, by slot number. */
  answer: string[];
  /** What the finished program prints. */
  output?: string[];
}

export interface CodeErrorQuestion<K extends CodeKey<'error'> = CodeKey<'error'>> extends QuestionBase {
  type: K;
  code: string[];
  /** 1-based visible line that the compiler rejects. */
  answer: number;
  error: string;
}

export interface CodeFixQuestion<K extends CodeKey<'fix'> = CodeKey<'fix'>> extends QuestionBase {
  type: K;
  code: string[];
  error: string;
  /** Each diff: `- old line` lines (a contiguous run of `code`) then `+ new line` lines. */
  opts: { diff: string[] }[];
  answer: number;
}

export interface CodeTypeQuestion<K extends CodeKey<'type'> = CodeKey<'type'>> extends QuestionBase {
  type: K;
  /** Exactly one `___` blank. */
  code: string[];
  /** Normalized answers (trimmed, single spaces); matching is case-sensitive. */
  accept: string[];
}

// ----- Rust questions -----

export type RustPredictQuestion = CodePredictQuestion<'rs-predict'>;
export type RustPairsQuestion = CodePairsQuestion<'rs-pairs'>;
export type RustCompilesQuestion = CodeCompilesQuestion<'rs-compiles'>;
export type RustBuildQuestion = CodeBuildQuestion<'rs-build'>;
export type RustErrorQuestion = CodeErrorQuestion<'rs-error'>;
export type RustFixQuestion = CodeFixQuestion<'rs-fix'>;
export type RustTypeQuestion = CodeTypeQuestion<'rs-type'>;

export type RustQuestion =
  | RustPredictQuestion
  | RustPairsQuestion
  | RustCompilesQuestion
  | RustBuildQuestion
  | RustErrorQuestion
  | RustFixQuestion
  | RustTypeQuestion;

// ----- TypeScript questions -----

export type TsPredictQuestion = CodePredictQuestion<'ts-predict'>;
export type TsPairsQuestion = CodePairsQuestion<'ts-pairs'>;
export type TsCompilesQuestion = CodeCompilesQuestion<'ts-compiles'>;
export type TsBuildQuestion = CodeBuildQuestion<'ts-build'>;
export type TsErrorQuestion = CodeErrorQuestion<'ts-error'>;
export type TsFixQuestion = CodeFixQuestion<'ts-fix'>;
export type TsTypeQuestion = CodeTypeQuestion<'ts-type'>;

/** "Hover the type": the type the editor shows for `name` on `line`, narrowing included. */
export interface TsInferQuestion extends QuestionBase {
  type: 'ts-infer';
  code: string[];
  /** 1-based visible line. It must not reassign `name`, apart from declaring it. */
  line: number;
  /** An identifier that appears on `line` as a whole word. */
  name: string;
  /** Type texts, e.g. `string | number`; each tile reads `name: <type>`. */
  opts: string[];
  answer: number;
}

export type TsQuestion =
  | TsPredictQuestion
  | TsPairsQuestion
  | TsInferQuestion
  | TsCompilesQuestion
  | TsBuildQuestion
  | TsErrorQuestion
  | TsFixQuestion
  | TsTypeQuestion;

/** Every code-course question. */
export type CodeQuestion = RustQuestion | TsQuestion;
/** The code questions of one shared type, e.g. `CodeQ<'predict'>`. */
export type CodeQ<K extends string> = Extract<CodeQuestion, { type: CodeKey<K> }>;

export type Question = CssQuestion | CodeQuestion;

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
