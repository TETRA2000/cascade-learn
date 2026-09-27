// Course ids and question-type keys as values, so validation and progress
// parsing can check untrusted data against them.

export const COURSE_IDS = ['css', 'rust', 'ts'] as const;
export type CourseId = (typeof COURSE_IDS)[number];

export function isCourseId(v: unknown): v is CourseId {
  return COURSE_IDS.includes(v as CourseId);
}

/** SVGs exported by components/icons.tsx that a course may use. */
export const COURSE_ICON_NAMES = ['css', 'rust', 'ts'] as const;
export type CourseIconName = (typeof COURSE_ICON_NAMES)[number];

/** CSS question types in difficulty order; css/question-types.json must match. */
export const CSS_TYPE_KEYS = ['predict', 'pairs', 'versus', 'build', 'tune', 'bug', 'type'] as const;
export type CssTypeKey = (typeof CSS_TYPE_KEYS)[number];

/** Rust question types in difficulty order; rust/question-types.json must match. */
export const RUST_TYPE_KEYS = ['rs-predict', 'rs-pairs', 'rs-compiles', 'rs-build', 'rs-error', 'rs-fix', 'rs-type'] as const;
export type RustTypeKey = (typeof RUST_TYPE_KEYS)[number];

/** TypeScript question types in difficulty order; ts/question-types.json must match. */
export const TS_TYPE_KEYS = ['ts-predict', 'ts-pairs', 'ts-infer', 'ts-compiles', 'ts-build', 'ts-error', 'ts-fix', 'ts-type'] as const;
export type TsTypeKey = (typeof TS_TYPE_KEYS)[number];

export type QuestionTypeKey = CssTypeKey | RustTypeKey | TsTypeKey;

/** Each course's question types, in the order its question-types.json must list them. */
export const TYPE_KEYS: Record<CourseId, readonly QuestionTypeKey[]> = {
  css: CSS_TYPE_KEYS,
  rust: RUST_TYPE_KEYS,
  ts: TS_TYPE_KEYS,
};
